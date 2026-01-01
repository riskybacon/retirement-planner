"""Tests for LLM error handling."""

from __future__ import annotations

from typing import Any
from unittest.mock import Mock

import pytest
import requests

from backend.app.llm import (
    HTTP_BAD_GATEWAY,
    HTTP_TOO_MANY_REQUESTS,
    HTTP_UNAUTHORIZED,
    LLMError,
    _extract_message_content,
    _handle_http_error,
    ask_openai,
    ask_with_provider,
)


def test_handle_http_error_rate_limit() -> None:
    """Ensure 429 errors map to user-friendly rate limit responses."""
    response = requests.Response()
    response.status_code = HTTP_TOO_MANY_REQUESTS
    error = requests.HTTPError()
    error.response = response

    handled = _handle_http_error(error)

    assert isinstance(handled, LLMError)
    assert handled.status_code == HTTP_TOO_MANY_REQUESTS


def test_handle_http_error_unauthorized() -> None:
    """Ensure 401 errors map to API key messages."""
    response = requests.Response()
    response.status_code = HTTP_UNAUTHORIZED
    error = requests.HTTPError()
    error.response = response

    handled = _handle_http_error(error)

    assert handled.status_code == HTTP_UNAUTHORIZED
    assert "API key" in handled.detail


def test_handle_http_error_unknown_defaults_to_bad_gateway() -> None:
    """Ensure unknown HTTP statuses map to 502."""
    response = requests.Response()
    response.status_code = 418
    error = requests.HTTPError()
    error.response = response

    handled = _handle_http_error(error)

    assert handled.status_code == HTTP_BAD_GATEWAY
    assert "418" in handled.detail


def test_extract_message_content() -> None:
    """Extract content from a valid chat completion response."""
    response: dict[str, Any] = {"choices": [{"message": {"content": "Answer"}}]}

    content = _extract_message_content(response)

    assert content == "Answer"


def test_extract_message_content_missing_choices() -> None:
    """Raise when choices are missing."""
    with pytest.raises(RuntimeError, match="missing choices"):
        _extract_message_content({})


def test_extract_message_content_missing_content() -> None:
    """Raise when content is missing."""
    response: dict[str, Any] = {"choices": [{"message": {}}]}
    with pytest.raises(RuntimeError, match="missing content"):
        _extract_message_content(response)


def test_ask_openai_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return content for a successful OpenAI response."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    response = Mock()
    response.raise_for_status = Mock()
    response.json.return_value = {"choices": [{"message": {"content": "OK"}}]}
    post = Mock(return_value=response)
    monkeypatch.setattr(requests, "post", post)

    answer = ask_openai("Question?", {"portfolio": 100}, {"success_rate": 0.5})

    assert answer == "OK"
    post.assert_called_once()


def test_ask_openai_missing_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Raise when OPENAI_API_KEY is missing."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="OPENAI_API_KEY"):
        ask_openai("Question?", {}, {})


def test_ask_openai_http_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Map HTTP errors into LLMError responses."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    response = Mock()
    response.raise_for_status.side_effect = requests.HTTPError(
        response=requests.Response()
    )
    response.raise_for_status.side_effect.response.status_code = HTTP_TOO_MANY_REQUESTS
    post = Mock(return_value=response)
    monkeypatch.setattr(requests, "post", post)

    with pytest.raises(LLMError, match="Rate limited"):
        ask_openai("Question?", {}, {})


def test_ask_openai_request_exception(monkeypatch: pytest.MonkeyPatch) -> None:
    """Map network exceptions into LLMError."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(requests, "post", Mock(side_effect=requests.RequestException))

    with pytest.raises(LLMError) as exc:
        ask_openai("Question?", {}, {})

    assert exc.value.status_code == HTTP_BAD_GATEWAY


def test_ask_with_provider_openai(monkeypatch: pytest.MonkeyPatch) -> None:
    """Route to OpenAI by default."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr("backend.app.llm.ask_openai", Mock(return_value="OK"))

    answer = ask_with_provider("Question?", {}, {})

    assert answer == "OK"


def test_ask_with_provider_unsupported(monkeypatch: pytest.MonkeyPatch) -> None:
    """Raise when an unsupported provider is requested."""
    monkeypatch.setenv("LLM_PROVIDER", "unknown")
    with pytest.raises(RuntimeError, match="Unsupported LLM provider"):
        ask_with_provider("Question?", {}, {})
