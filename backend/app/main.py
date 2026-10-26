from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User, Topic, TopicVote
from app.routes.auth import router as auth_router
from app.routes.topics import router as topics_router

def seed_initial_topics():
    db = SessionLocal()
    try:
        topic_count = db.query(Topic).count()
        if topic_count == 0:
            print("🌱 Seeding initial community learning topics...")
            # Create a sample community user
            demo_user = db.query(User).filter(User.email == "community@learntogether.org").first()
            if not demo_user:
                demo_user = User(
                    sso_user_id="sso-seed-community-lead",
                    name="LearnTogether Community",
                    email="community@learntogether.org",
                    avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=LT"
                )
                db.add(demo_user)
                db.flush()

            # Additional seed users for votes
            alice = User(sso_user_id="sso-alice", name="Alice Chen", email="alice.chen@example.com", avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=AC")
            bob = User(sso_user_id="sso-bob", name="Bob Martinez", email="bob.martinez@example.com", avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=BM")
            charlie = User(sso_user_id="sso-charlie", name="Charlie Patel", email="charlie.patel@example.com", avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=CP")
            db.add_all([alice, bob, charlie])
            db.flush()

            topics_data = [
                ("Python Programming", [demo_user.id, alice.id, bob.id, charlie.id]),
                ("Artificial Intelligence & LLMs", [demo_user.id, alice.id, bob.id]),
                ("React & TypeScript", [demo_user.id, bob.id]),
                ("Data Science with Pandas", [demo_user.id, charlie.id]),
                ("Cloud Architecture on AWS", [demo_user.id])
            ]

            for title, voter_ids in topics_data:
                topic = Topic(
                    title=title,
                    normalized_title=title.strip().lower(),
                    created_by=demo_user.id,
                    creator_name=demo_user.name,
                    creator_email=demo_user.email
                )
                db.add(topic)
                db.flush()

                for uid in voter_ids:
                    db.add(TopicVote(user_id=uid, topic_id=topic.id))

            db.commit()
            print("✅ Initial community topics seeded successfully.")
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    # Seeding disabled to keep database clean
    yield

app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="Backend REST API for LearnTogether - Topic Sharing & Community Learning Application.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(topics_router)

# Mount Frontend static files if built
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/", tags=["Health"])
    def root():
        return {
            "app": settings.APP_NAME,
            "status": "online",
            "docs": "/docs",
            "api": "/api/topics"
        }

