from flask import jsonify


def erro_json(codigo: str, mensagem: str, status: int, detalhes: dict = None):
    """Formato de erro padrão da API (docs/07)."""
    resposta = jsonify({"erro": codigo, "mensagem": mensagem, "detalhes": detalhes or {}})
    resposta.status_code = status
    return resposta
