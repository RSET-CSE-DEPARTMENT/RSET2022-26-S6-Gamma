from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
import anyio
from fastapi.concurrency import run_in_threadpool
from ai_chat.agent import agent

router = APIRouter()

class ChatRequest(BaseModel):
    patient_id: str
    stay_id: Optional[str] = None
    query: str
    thread_id: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    thread_id: str

@router.post("/chat", response_model=ChatResponse)
async def clinical_chat(request: ChatRequest):
    thread_id = request.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}
    
    # Clean up context string so the AI doesn't get confused by brackets
    contextual_query = (
        f"Context: Looking at Patient {request.patient_id}. "
        f"Question: {request.query}"
    )

    try:
        result = await run_in_threadpool(
            agent.invoke,
            {"messages": [{"role": "user", "content": contextual_query}]},
            config
        )
        
        # 1. Get the raw content
        raw_content = result["messages"][-1].content
        
        # 2. Extract text if it's a list (Gemini style) or use as is if string
        if isinstance(raw_content, list):
            # Extract the 'text' field from the first dictionary in the list
            ai_reply = raw_content[0].get('text', str(raw_content))
        else:
            ai_reply = str(raw_content)

        return ChatResponse(reply=ai_reply, thread_id=thread_id)
        
    except Exception as e:
        # This will show you exactly what's failing in your terminal
        print(f"CRITICAL AGENT ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Agent Error: {str(e)}")