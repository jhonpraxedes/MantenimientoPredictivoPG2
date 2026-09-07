from fastapi import FastAPI

app = FastAPI(title="Sistema de Mantenimiento Predictivo")


@app.get("/")
def read_root():
    return {
        "status": "ok",
        "mensaje": "API funcionando correctamente"
    }
