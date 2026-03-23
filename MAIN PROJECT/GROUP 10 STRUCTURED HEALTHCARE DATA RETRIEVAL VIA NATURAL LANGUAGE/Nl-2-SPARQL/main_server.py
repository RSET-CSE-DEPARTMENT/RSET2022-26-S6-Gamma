import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import your sub-routers (we will define these below)
from main import router as triage_router
from ai_chat.api_server import router as chat_router
import os

os.environ["LANGCHAIN_TRACING_V2"] = "false"  # Disable telemetry
app = FastAPI(title="AI Ward Command Center - Unified API")

# Add CORS middleware so Streamlit can talk to FastAPI without issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include Routers ---
# This combines all endpoints into one app
app.include_router(triage_router)
app.include_router(chat_router)

@app.get("/")
def root():
    return {"message": "Unified Hospital API is Online"}

if __name__ == "__main__":
    # Standardizing to port 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)