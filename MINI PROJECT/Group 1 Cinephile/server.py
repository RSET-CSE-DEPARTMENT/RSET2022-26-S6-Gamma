from aiohttp import web
import asyncio
import logging
import traceback
import sys
from recommendation_api import get_personalized_recommendations

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def handle_recommendations(request):
    """Handle recommendations endpoint."""
    try:
        logger.info("Received recommendations request")
        user_id = request.query.get('userId')
        
        if not user_id:
            logger.error("No userId provided")
            return web.json_response(
                {"error": "userId parameter is required"},
                status=400
            )
            
        logger.info(f"Processing recommendations for user: {user_id}")
        recommendations = await get_personalized_recommendations(user_id)
        
        if not recommendations:
            logger.warning(f"No recommendations found for user: {user_id}")
            return web.json_response(
                {"error": "No recommendations found"},
                status=404
            )
            
        logger.info(f"Returning {len(recommendations)} recommendations")
        return web.json_response(recommendations)
        
    except Exception as e:
        logger.error(f"Error processing recommendations: {str(e)}")
        logger.error(traceback.format_exc())
        return web.json_response(
            {"error": "Internal server error"},
            status=500
        )

def start_server(port=8001):
    """Start the server on the specified port."""
    app = web.Application()
    app.router.add_get('/api/recommendations', handle_recommendations)
    app.router.add_static('/', path='./')
    
    try:
        logger.info(f"Starting server on port {port}...")
        web.run_app(app, port=port, host='0.0.0.0')
    except OSError as e:
        if e.errno == 10048:  # Port already in use
            logger.error(f"Port {port} is already in use. Trying port {port + 1}")
            start_server(port + 1)
        else:
            logger.error(f"Error starting server: {e}")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    try:
        start_server()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        sys.exit(0) 