"""LLM integration helpers for explaining simulations."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import requests

logger = logging.getLogger(__name__)

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
HTTP_TOO_MANY_REQUESTS = 429
HTTP_UNAUTHORIZED = 401
HTTP_BAD_GATEWAY = 502


class LLMError(Exception):
    """Represents a handled LLM error with an HTTP status."""

    def __init__(self, status_code: int, detail: str) -> None:
        """Create a new LLMError with a status code and message."""
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def ask_with_provider(question: str, inputs: dict[str, object], summary: dict[str, object]) -> str:
    """Route a question to the configured provider and return the answer."""
    provider = os.environ.get("LLM_PROVIDER", "openai").lower()
    if provider == "openai":
        return ask_openai(question, inputs, summary)
    message = f"Unsupported LLM provider: {provider}"
    raise RuntimeError(message)


def ask_openai(question: str, inputs: dict[str, object], summary: dict[str, object]) -> str:
    """Send a structured explanation request to OpenAI."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        message = "OPENAI_API_KEY is not set."
        raise RuntimeError(message)

    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a retirement planning assistant. Provide a concise explanation of the "
                    "latest simulation and give structured suggestions to improve outcomes. "
                    "Return JSON with keys: summary (string), suggestions (array of strings)."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "question": question,
                        "inputs": inputs,
                        "summary": summary,
                    }
                ),
            },
        ],
        "temperature": 0.3,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        response = requests.post(
            OPENAI_URL,
            json=payload,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
    except requests.HTTPError as error:
        raise _handle_http_error(error) from error
    except requests.RequestException as error:
        message = "LLM request failed due to a network error."
        raise LLMError(HTTP_BAD_GATEWAY, message) from error

    return _extract_message_content(response.json())


def _extract_message_content(response: dict[str, Any]) -> str:
    """Extract the assistant message content from a chat completion response."""
    choices = response.get("choices", [])
    if not choices:
        message = "LLM response missing choices."
        raise RuntimeError(message)
    message = choices[0].get("message", {})
    content = message.get("content")
    if not content:
        message = "LLM response missing content."
        raise RuntimeError(message)
    if not isinstance(content, str):
        message = "LLM response content is not a string."
        raise TypeError(message)
    return content


def _handle_http_error(error: requests.HTTPError) -> LLMError:
    """Translate HTTP errors into friendly LLM errors."""
    status_code = error.response.status_code if error.response is not None else HTTP_BAD_GATEWAY
    if status_code == HTTP_TOO_MANY_REQUESTS:
        return LLMError(
            HTTP_TOO_MANY_REQUESTS,
            "Rate limited by the LLM provider. Please try again.",
        )
    if status_code == HTTP_UNAUTHORIZED:
        return LLMError(HTTP_UNAUTHORIZED, "LLM provider rejected the API key.")
    return LLMError(HTTP_BAD_GATEWAY, f"LLM request failed with status {status_code}.")
