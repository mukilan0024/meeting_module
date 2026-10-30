from __future__ import annotations

import uuid

from fastapi import HTTPException, status


class NotFoundException(HTTPException):
    def __init__(self, entity: str, entity_id: str | uuid.UUID) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity} with id '{entity_id}' was not found.",
        )


class ConflictException(HTTPException):
    def __init__(self, detail: str) -> None:
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class OptimisticLockException(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Document version mismatch — it has been modified by another user. "
                "Please re-fetch the latest version and retry your update."
            ),
        )


class ValidationException(HTTPException):
    def __init__(self, detail: str) -> None:
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class AIJobException(HTTPException):
    def __init__(self, detail: str) -> None:
        super().__init__(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
