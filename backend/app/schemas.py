from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class PlayerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str | None = None
    initial_rating: float = Field(default=5.0, ge=1.0, le=16.5)


class PlayerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: str | None = None
    initial_rating: float | None = Field(default=None, ge=1.0, le=16.5)


class PlayerOut(BaseModel):
    id: int
    name: str
    email: str | None
    initial_rating: float
    str_rating: float
    is_projected: bool
    match_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SetScore(BaseModel):
    player1_games: int = Field(ge=0)
    player2_games: int = Field(ge=0)


class MatchCreate(BaseModel):
    player1_id: int
    player2_id: int
    sets: list[SetScore] = Field(min_length=1)
    match_format: str = "best_of_3"
    played_at: datetime | None = None
    notes: str | None = None
    recorded_by: str | None = None

    @field_validator("match_format")
    @classmethod
    def validate_format(cls, value: str) -> str:
        allowed = {"single_set", "pro_set", "best_of_3", "best_of_5"}
        if value not in allowed:
            raise ValueError(f"match_format must be one of {sorted(allowed)}")
        return value

    @field_validator("player2_id")
    @classmethod
    def different_players(cls, value: int, info) -> int:
        if info.data.get("player1_id") == value:
            raise ValueError("player1 and player2 must be different")
        return value


class MatchUpdate(BaseModel):
    player1_games: int | None = Field(default=None, ge=0)
    player2_games: int | None = Field(default=None, ge=0)
    match_format: str | None = None
    played_at: datetime | None = None
    notes: str | None = None

    @field_validator("match_format")
    @classmethod
    def validate_format(cls, value: str | None) -> str | None:
        if value is None:
            return value
        allowed = {"single_set", "pro_set", "best_of_3", "best_of_5"}
        if value not in allowed:
            raise ValueError(f"match_format must be one of {sorted(allowed)}")
        return value


class MatchOut(BaseModel):
    id: int
    player1_id: int
    player2_id: int
    player1_name: str
    player2_name: str
    player1_games: int
    player2_games: int
    match_format: str
    played_at: datetime
    notes: str | None
    recorded_by: str | None
    player1_match_rating: float | None = None
    player2_match_rating: float | None = None

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    rank: int
    id: int
    name: str
    str_rating: float
    is_projected: bool
    match_count: int


class PlayerDetail(PlayerOut):
    recent_matches: list[MatchOut]
    rating_history: list[dict]
