from fastapi import FastAPI

app = FastAPI(
    title="Brightloop Subscription Management API",
    version="0.1.0",
)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
