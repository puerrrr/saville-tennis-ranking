"""
Saville Tennis Ranking (STR) — UTR-inspired rating engine.

STR uses a modified Elo approach:
1. For each match, compute a match rating from rating gap + actual game-win %.
2. Player STR = weighted average of up to 30 most recent eligible match ratings
   within the last 12 months.

Match weight factors: format length, competitiveness, opponent reliability, time decay.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from math import exp

# UTR uses roughly a 1.00–16.50 scale; STR follows the same convention.
MIN_RATING = 1.0
MAX_RATING = 16.5
DEFAULT_RATING = 5.0
RATING_SCALE = 1.6  # ~1.6 STR points ≈ 10:1 expected game odds
RELIABLE_MATCH_COUNT = 5
MAX_MATCHES = 30
MATCH_WINDOW_DAYS = 365
PERFORMANCE_MULTIPLIER = 2.0

FORMAT_WEIGHTS = {
    "single_set": 0.6,
    "pro_set": 0.8,
    "best_of_3": 1.0,
    "best_of_5": 1.2,
}


@dataclass
class MatchRecord:
    match_id: int
    opponent_rating: float
    player_games: int
    opponent_games: int
    match_format: str
    played_at: datetime
    opponent_match_count: int


@dataclass
class MatchContribution:
    match_id: int
    match_rating: float
    weight: float
    played_at: datetime


@dataclass
class PlayerRatingResult:
    rating: float
    is_projected: bool
    match_count: int
    contributions: list[MatchContribution]


def clamp_rating(value: float) -> float:
    return max(MIN_RATING, min(MAX_RATING, value))


def expected_game_win_pct(player_rating: float, opponent_rating: float) -> float:
    return 1.0 / (1.0 + 10 ** ((opponent_rating - player_rating) / RATING_SCALE))


def compute_match_ratings(
    player_rating: float,
    opponent_rating: float,
    player_games: int,
    opponent_games: int,
) -> tuple[float, float]:
    total_games = player_games + opponent_games
    if total_games <= 0:
        return player_rating, opponent_rating

    actual_pct = player_games / total_games
    expected_pct = expected_game_win_pct(player_rating, opponent_rating)
    shift = (actual_pct - expected_pct) * PERFORMANCE_MULTIPLIER

    return clamp_rating(player_rating + shift), clamp_rating(opponent_rating - shift)


def format_weight(match_format: str) -> float:
    return FORMAT_WEIGHTS.get(match_format, FORMAT_WEIGHTS["best_of_3"])


def competitiveness_weight(rating_diff: float) -> float:
    return max(0.15, 1.0 - abs(rating_diff) * 0.12)


def reliability_weight(opponent_match_count: int) -> float:
    if opponent_match_count >= RELIABLE_MATCH_COUNT:
        return 1.0
    return 0.5 + 0.5 * (opponent_match_count / RELIABLE_MATCH_COUNT)


def time_weight(played_at: datetime, reference: datetime | None = None) -> float:
    ref = reference or datetime.utcnow()
    days_ago = max(0.0, (ref - played_at).total_seconds() / 86400.0)
    return exp(-days_ago / 120.0)


def match_weight(
    player_rating: float,
    opponent_rating: float,
    match_format: str,
    opponent_match_count: int,
    played_at: datetime,
    reference: datetime | None = None,
) -> float:
    rating_diff = opponent_rating - player_rating
    return (
        format_weight(match_format)
        * competitiveness_weight(rating_diff)
        * reliability_weight(opponent_match_count)
        * time_weight(played_at, reference)
    )


def eligible_matches(
    records: list[MatchRecord],
    reference: datetime | None = None,
) -> list[MatchRecord]:
    ref = reference or datetime.utcnow()
    cutoff = ref - timedelta(days=MATCH_WINDOW_DAYS)
    recent = [r for r in records if r.played_at >= cutoff]
    recent.sort(key=lambda r: r.played_at, reverse=True)
    return recent[:MAX_MATCHES]


def compute_player_rating(
    records: list[MatchRecord],
    initial_rating: float = DEFAULT_RATING,
    reference: datetime | None = None,
) -> PlayerRatingResult:
    ref = reference or datetime.utcnow()
    eligible = eligible_matches(records, ref)

    if not eligible:
        return PlayerRatingResult(
            rating=initial_rating,
            is_projected=True,
            match_count=0,
            contributions=[],
        )

    # Iteratively refine ratings: each match uses opponent STR at time of calculation.
    # For a club system we approximate by using current opponent ratings in one pass,
    # then a second pass for stability when many matches exist.
    player_rating = initial_rating
    for _ in range(3):
        contributions: list[MatchContribution] = []
        for record in eligible:
            mr, _ = compute_match_ratings(
                player_rating,
                record.opponent_rating,
                record.player_games,
                record.opponent_games,
            )
            w = match_weight(
                player_rating,
                record.opponent_rating,
                record.match_format,
                record.opponent_match_count,
                record.played_at,
                ref,
            )
            contributions.append(
                MatchContribution(
                    match_id=record.match_id,
                    match_rating=mr,
                    weight=w,
                    played_at=record.played_at,
                )
            )

        total_weight = sum(c.weight for c in contributions)
        if total_weight <= 0:
            break
        player_rating = sum(c.match_rating * c.weight for c in contributions) / total_weight
        player_rating = clamp_rating(player_rating)

    total_weight = sum(c.weight for c in contributions)
    if total_weight <= 0:
        final_rating = initial_rating
    else:
        final_rating = clamp_rating(
            sum(c.match_rating * c.weight for c in contributions) / total_weight
        )

    return PlayerRatingResult(
        rating=round(final_rating, 2),
        is_projected=len(eligible) < RELIABLE_MATCH_COUNT,
        match_count=len(eligible),
        contributions=contributions,
    )
