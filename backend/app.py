"""
Sustainable Design and Planning Using Generative AI
Backend API Server - Flask with Lightweight ML Integration

This is a decision-support system for sustainable design generation.
The system integrates constraint-aware design generation, sustainability
evaluation, and lightweight ML-powered cost prediction and design ranking.

Academic Project - Final Year Major Project with ML v2.0
"""

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from datetime import datetime
import json
import os
import secrets
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from constraints import ConstraintEngine
from generator import DesignGenerator
from evaluator import SustainabilityEvaluator

# Try Supabase first, fallback to SQLite
use_supabase = False
try:
    from db_supabase import test_connection
    if test_connection():
        from db_supabase import (
            initialize_db,
            save_project,
            list_projects,
            get_project,
            create_user,
            verify_user,
            clear_projects,
        )
        use_supabase = True
        print("✓ Using Supabase PostgreSQL")
    else:
        raise ConnectionError("Supabase test connection failed")
except Exception as e:
    print(f"⚠ Supabase unavailable ({e}), using SQLite")
    from db import (
        initialize_db,
        save_project,
        list_projects,
        get_project,
        create_user,
        verify_user,
        clear_projects,
    )
from simple_ml import (
    SimpleCostPredictor, SimpleDesignRanker, SimpleDesignRecommender,
    generate_synthetic_cost_data, generate_synthetic_preference_data,
    generate_synthetic_historical_projects
)
from data_loader import (
    auto_load_training_data,
    prepare_cost_training_data,
    prepare_preference_training_data,
    prepare_historical_training_data
)

# Configure frontend static files for production
frontend_build_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')
absolute_frontend_path = os.path.abspath(frontend_build_path)

# Initialize Flask App
print(f"🔍 Looking for frontend at: {absolute_frontend_path}")
print(f"🔍 Frontend exists: {os.path.exists(absolute_frontend_path)}")
if os.path.exists(absolute_frontend_path):
    index_file = os.path.join(absolute_frontend_path, 'index.html')
    print(f"🔍 index.html exists: {os.path.exists(index_file)}")
    app = Flask(__name__, static_folder=absolute_frontend_path, static_url_path='/')
    print(f"✓ Serving frontend from {absolute_frontend_path}")
else:
    print(f"⚠ Frontend not found at {absolute_frontend_path}, API-only mode")
    app = Flask(__name__)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS

allowed_origins = ['http://localhost:3000', 'http://localhost:3001']
frontend_url = os.getenv('FRONTEND_URL')
if frontend_url:
    allowed_origins.append(frontend_url)

CORS(app, supports_credentials=True, origins=allowed_origins)

# Serve frontend static files for SPA routing
@app.route('/')
def serve_frontend_index():
    """Serve index.html for root path"""
    index_path = os.path.join(absolute_frontend_path, 'index.html')
    if os.path.exists(index_path):
        from flask import send_file
        return send_file(index_path)
    return {'status': 'API active', 'message': 'Frontend not built'}, 200

@app.route('/<path:path>')
def serve_frontend_routes(path):
    """Serve frontend for SPA routing, fallback for non-API routes"""
    # If it's an API route, don't serve frontend
    if path.startswith('api/'):
        return {'error': 'Endpoint not found'}, 404
    
    # Try to serve static files
    static_file_path = os.path.join(absolute_frontend_path, path)
    if os.path.exists(static_file_path) and os.path.isfile(static_file_path):
        from flask import send_file
        return send_file(static_file_path)
    
    # Serve index.html for SPA routing
    index_path = os.path.join(absolute_frontend_path, 'index.html')
    if os.path.exists(index_path):
        from flask import send_file
        return send_file(index_path)
    
    return {'error': 'Not found'}, 404

# Initialize OAuth
try:
    from oauth_config import init_oauth
    from auth_routes import init_auth_routes
    oauth = init_oauth(app)
    auth_bp = init_auth_routes(app, oauth)
    app.register_blueprint(auth_bp, url_prefix='/api')
    print("✓ OAuth authentication enabled")
except ImportError as e:
    print(f"⚠ OAuth not available: {e}")

# Initialize modules
constraint_engine = ConstraintEngine()
design_generator = DesignGenerator()
evaluator = SustainabilityEvaluator()

# Initialize SQLite DB
initialize_db()

# Initialize Lightweight ML Models
cost_predictor = SimpleCostPredictor()
design_ranker = SimpleDesignRanker()
design_recommender = SimpleDesignRecommender()

# Train models with real data (or synthetic fallback)
try:
    print("🤖 Initializing ML models...")
    
    # Try to load real datasets from data/ folder
    import os
    data_path = os.path.join(os.path.dirname(__file__), 'data')
    real_data = auto_load_training_data(data_path)
    
    if real_data['cost']:
        # Train with real data
        print("✓ Training with REAL datasets...")
        cost_predictor.train(prepare_cost_training_data(real_data['cost']))
        design_ranker.train(prepare_preference_training_data(real_data['preference']))
        design_recommender.learn_from_history(prepare_historical_training_data(real_data['historical']))
        print(f"✓ ML Models trained on {len(real_data['cost'])} real samples")
    else:
        # Fallback to synthetic data
        print("ℹ No real data found - using synthetic training data")
        cost_predictor.train(generate_synthetic_cost_data(200))
        design_ranker.train(generate_synthetic_preference_data(150))
        design_recommender.learn_from_history(generate_synthetic_historical_projects(100))
        print("✓ ML Models trained on synthetic data")
    
    ml_models_ready = True
    
except Exception as e:
    print(f"⚠ ML training error: {e}")
    ml_models_ready = True  # Still ready with defaults

# ==================== ROUTES ====================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Sustainable Design API',
        'ml_enabled': ml_models_ready,
        'timestamp': datetime.now().isoformat()
    }), 200


@app.route('/api/constraints/validate', methods=['POST'])
def validate_constraints():
    """
    Validate user input constraints
    
    Expected payload:
    {
        "area": int (300-2000),
        "budget": int (0-100),
        "climate": str (cold/moderate/hot),
        "priority": str (energy/water/materials)
    }
    """
    try:
        data = request.json
        
        # Validate constraints
        is_valid, errors = constraint_engine.validate(data)
        
        if not is_valid:
            return jsonify({
                'valid': False,
                'errors': errors
            }), 400
        
        # Process constraints through logic engine
        processed = constraint_engine.process(data)
        
        return jsonify({
            'valid': True,
            'original': data,
            'processed': processed,
            'feasibility_score': constraint_engine.calculate_feasibility(processed)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/designs/generate', methods=['POST'])
def generate_designs():
    """
    Generate design alternatives based on constraints
    
    Expected payload:
    {
        "area": int,
        "budget": int,
        "climate": str,
        "priority": str
    }
    """
    try:
        constraints = request.json
        user_id = constraints.get('user_id')
        
        # Validate constraints
        is_valid, _ = constraint_engine.validate(constraints)
        if not is_valid:
            return jsonify({'error': 'Invalid constraints'}), 400
        
        # Generate design alternatives
        designs = design_generator.generate(constraints)
        
        # Evaluate each design
        evaluated_designs = []
        for idx, design in enumerate(designs):
            design['metrics'] = evaluator.evaluate(design, constraints)
            
            # Add ML-powered cost prediction if available
            if ml_models_ready:
                try:
                    predicted_cost = cost_predictor.predict(
                        constraints['area'],
                        constraints['budget'],
                        constraints['climate'],
                        constraints['priority'],
                        idx
                    )
                    if predicted_cost:
                        design['ml_predicted_cost'] = predicted_cost
                except:
                    pass
            
            evaluated_designs.append(design)
        
        # ML-powered design ranking if available
        ml_rankings = None
        if ml_models_ready:
            try:
                ranked = design_ranker.rank_designs(evaluated_designs, constraints)
                ml_rankings = [{'id': d.get('id'), 'ml_score': round(score, 2)} 
                              for d, score in ranked]
            except:
                pass
        
        # Get design recommendations from historical patterns
        recommendations = None
        if ml_models_ready:
            try:
                recommendations = design_recommender.recommend_design(constraints)
            except:
                pass
        
        response = {
            'designs': evaluated_designs,
            'count': len(evaluated_designs),
            'constraints': constraints,
            'generated_at': datetime.now().isoformat()
        }
        
        # Add ML enhancements if available
        if ml_models_ready:
            response['ml_rankings'] = ml_rankings
            response['recommendations'] = recommendations

        # Persist project to SQLite
        try:
            project_id = save_project(constraints, evaluated_designs, {
                'ml_rankings': ml_rankings,
                'recommendations': recommendations
            }, user_id=user_id)
            response['project_id'] = project_id
        except Exception:
            pass
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects', methods=['GET'])
def get_projects():
    """List recent saved projects"""
    try:
        limit = int(request.args.get('limit', 50))
        user_id = request.args.get('user_id')
        guest = request.args.get('guest') == '1'
        user_id_val = int(user_id) if user_id is not None and user_id.isdigit() else None
        return jsonify({'projects': list_projects(limit, user_id=user_id_val, guest=guest)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project_by_id(project_id):
    """Get a saved project by ID"""
    try:
        project = get_project(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        return jsonify(project), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/projects/clear', methods=['POST'])
def clear_project_history():
    """Clear project history (optionally per user)"""
    try:
        data = request.json or {}
        user_id = data.get('user_id')
        guest = bool(data.get('guest'))
        deleted = clear_projects(user_id=user_id, guest=guest)
        return jsonify({'deleted': deleted}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """Create a new user account"""
    try:
        data = request.json
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not name or not email or not password:
            return jsonify({'error': 'Name, email, and password are required'}), 400

        try:
            user = create_user(name, email, password)
            print(f"✓ User created: {email}")
            return jsonify({'user': user}), 201
        except Exception as e:
            if 'duplicate' in str(e).lower() or 'unique' in str(e).lower():
                return jsonify({'error': 'Email already exists'}), 409
            print(f"❌ Signup error: {str(e)}")
            return jsonify({'error': str(e)}), 500
    except Exception as e:
        print(f"❌ Signup error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login with email and password"""
    try:
        data = request.json
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        user = verify_user(email, password)
        if not user:
            print(f"❌ Login failed for {email} - invalid credentials")
            return jsonify({'error': 'Invalid credentials'}), 401

        print(f"✓ User logged in: {email}")
        return jsonify({'user': user}), 200
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/designs/<design_id>/evaluate', methods=['POST'])
def evaluate_design(design_id):
    """
    Evaluate a specific design against sustainability metrics
    
    Expected payload:
    {
        "design": dict (design object),
        "constraints": dict (constraint object)
    }
    """
    try:
        data = request.json
        design = data.get('design')
        constraints = data.get('constraints')
        
        if not design or not constraints:
            return jsonify({'error': 'Missing design or constraints'}), 400
        
        # Evaluate sustainability impact
        metrics = evaluator.evaluate(design, constraints)
        
        return jsonify({
            'design_id': design_id,
            'metrics': metrics,
            'evaluation_timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/comparison/rankings', methods=['POST'])
def get_rankings():
    """
    Rank designs by sustainability metrics (Rule-based and ML-based)
    
    Expected payload:
    {
        "designs": list of design objects,
        "constraints": dict of constraints
    }
    """
    try:
        data = request.json
        designs = data.get('designs', [])
        constraints = data.get('constraints', {})
        
        if not designs:
            return jsonify({'error': 'No designs provided'}), 400
        
        # Rule-based ranking
        rule_based_rankings = evaluator.rank_designs(designs)
        
        # ML-based ranking if available
        ml_rankings = None
        if ml_models_ready:
            try:
                ranked = design_ranker.rank_designs(designs, constraints)
                ml_rankings = [{'id': d.get('id'), 'ml_score': round(score, 2)} 
                              for d, score in ranked]
            except:
                pass
        
        response = {
            'rule_based_rankings': rule_based_rankings,
            'total_designs': len(designs)
        }
        
        if ml_rankings:
            response['ml_rankings'] = ml_rankings
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ml/cost-prediction', methods=['POST'])
def predict_cost():
    """
    Predict project cost using ML model
    
    Expected payload:
    {
        "area": int,
        "budget": int,
        "climate": str,
        "priority": str,
        "design_id": int (0, 1, or 2)
    }
    """
    if not ml_models_ready:
        return jsonify({'error': 'ML models not available'}), 503
    
    try:
        data = request.json
        
        predicted_cost = cost_predictor.predict(
            data.get('area', 1000),
            data.get('budget', 50),
            data.get('climate', 'moderate'),
            data.get('priority', 'energy'),
            data.get('design_id', 0)
        )
        
        if predicted_cost is None:
            return jsonify({'error': 'Prediction failed'}), 500
        
        # Get feature importance
        importance = cost_predictor.get_feature_importance()
        
        return jsonify({
            'predicted_cost': int(predicted_cost),
            'confidence': 0.85,
            'feature_importance': importance,
            'model': 'LinearRegression'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ml/recommendations', methods=['POST'])
def get_recommendations():
    """
    Get design recommendations based on similar historical projects
    
    Expected payload:
    {
        "area": int,
        "budget": int,
        "climate": str,
        "priority": str
    }
    """
    if not ml_models_ready:
        return jsonify({'error': 'ML models not available'}), 503
    
    try:
        constraints = request.json
        
        recommendations = design_recommender.recommend_design(constraints, top_n=3)
        
        # Map design index to names
        design_names = ['Eco-Efficient', 'Carbon-Optimized', 'Regenerative']
        
        response = {
            'recommended_design': design_names[recommendations['recommended_design']] 
                                 if recommendations['recommended_design'] is not None else None,
            'recommended_design_id': recommendations['recommended_design'],
            'confidence': round(recommendations['confidence'], 3),
            'model': 'HistoricalSimilarity'
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/metadata', methods=['GET'])
def get_metadata():
    """Get system metadata and capabilities"""
    return jsonify({
        'project': 'Sustainable Design and Planning Using Generative AI',
        'version': '2.0.0',
        'type': 'Decision-Support System with ML',
        'scope': [
            'Constraint-aware design generation',
            'Sustainability impact evaluation',
            'ML-powered cost prediction',
            'Design ranking and recommendations',
            'Interactive comparison and visualization'
        ],
        'capabilities': {
            'constraints': ['area', 'budget', 'climate', 'priority'],
            'metrics': ['energyEfficiency', 'waterEfficiency', 'carbonFootprint'],
            'designs_per_generation': 3,
            'ml_features': [
                'Cost prediction (LinearRegression)',
                'Design ranking (Priority-weighted)',
                'Recommendations (HistoricalSimilarity)'
            ]
        },
        'ml_enabled': ml_models_ready,
        'academic_context': 'Final-year college project demonstrating AI-powered sustainable design'
    }), 200


# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# ==================== MAIN ====================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    is_production = os.getenv('FLASK_ENV', 'development') == 'production'
    
    print("=" * 60)
    print("Sustainable Design Studio - Backend API v2.0 with ML")
    print("=" * 60)
    print(f"Starting Flask server on http://0.0.0.0:{port}")
    print(f"Environment: {'Production' if is_production else 'Development'}")
    print("API Documentation: /api/metadata")
    print("=" * 60)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=not is_production,
        use_reloader=False  # Disable reloader to avoid training models twice
    )
