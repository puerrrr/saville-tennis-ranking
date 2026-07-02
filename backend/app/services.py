from datetime import datetime

from sqlalchemy.orm import Session

from . import rating
from .models import Match, Player


def build_match_records_for_player(
    db: Session,
    player_id: int,
    all_ratings: dict[int, float],
    all_match_counts: dict[int, int],
) -> list[rating.MatchRecord]:
    matches = (
        db.query(Match)
        .filter((Match.player1_id == player_id) | (Match.player2_id == player_id))
        .order_by(Match.played_at.desc())
        .all()
    )

    records: list[rating.MatchRecord] = []
    for match in matches:
        if match.player1_id == player_id:
            opponent_id = match.player2_id
            player_games = match.player1_games
            opponent_games = match.player2_games
        else:
            opponent_id = match.player1_id
            player_games = match.player2_games
            opponent_games = match.player1_games

        records.append(
            rating.MatchRecord(
                match_id=match.id,
                opponent_rating=all_ratings.get(opponent_id, rating.DEFAULT_RATING),
                player_games=player_games,
                opponent_games=opponent_games,
                match_format=match.match_format,
                played_at=match.played_at,
                opponent_match_count=all_match_counts.get(opponent_id, 0),
            )
        )
    return records


def compute_all_ratings(db: Session) -> dict[int, rating.PlayerRatingResult]:
    players = db.query(Player).all()
    if not players:
        return {}

    # Bootstrap with initial ratings
    current: dict[int, float] = {p.id: p.initial_rating for p in players}
    counts: dict[int, int] = {p.id: 0 for p in players}

    for _ in range(5):
        results: dict[int, rating.PlayerRatingResult] = {}
        for player in players:
            records = build_match_records_for_player(
                db, player.id, current, counts
            )
            result = rating.compute_player_rating(records, player.initial_rating)
            results[player.id] = result
            current[player.id] = result.rating
            counts[player.id] = result.match_count
        if len(players) <= 1:
            break

    return results


def get_player_rating(db: Session, player_id: int) -> rating.PlayerRatingResult:
    all_results = compute_all_ratings(db)
    player = db.get(Player, player_id)
    if not player:
        raise ValueError("Player not found")
    return all_results.get(
        player_id,
        rating.PlayerRatingResult(
            rating=player.initial_rating,
            is_projected=True,
            match_count=0,
            contributions=[],
        ),
    )


def sum_games_from_sets(sets: list) -> tuple[int, int]:
    p1 = sum(s.player1_games for s in sets)
    p2 = sum(s.player2_games for s in sets)
    return p1, p2


def match_to_out(
    match: Match,
    p1_name: str,
    p2_name: str,
    p1_rating: float | None = None,
    p2_rating: float | None = None,
) -> dict:
    p1_mr, p2_mr = None, None
    if p1_rating is not None and p2_rating is not None:
        p1_mr, p2_mr = rating.compute_match_ratings(
            p1_rating,
            p2_rating,
            match.player1_games,
            match.player2_games,
        )

    return {
        "id": match.id,
        "player1_id": match.player1_id,
        "player2_id": match.player2_id,
        "player1_name": p1_name,
        "player2_name": p2_name,
        "player1_games": match.player1_games,
        "player2_games": match.player2_games,
        "match_format": match.match_format,
        "played_at": match.played_at,
        "notes": match.notes,
        "recorded_by": match.recorded_by,
        "player1_match_rating": round(p1_mr, 2) if p1_mr is not None else None,
        "player2_match_rating": round(p2_mr, 2) if p2_mr is not None else None,
    }


def build_rating_history(
    db: Session,
    player_id: int,
    player: Player,
) -> list[dict]:
    matches = (
        db.query(Match)
        .filter((Match.player1_id == player_id) | (Match.player2_id == player_id))
        .order_by(Match.played_at.asc())
        .all()
    )

    history: list[dict] = []
    cumulative: list[rating.MatchRecord] = []

    for match in matches:
        opponent_id = match.player2_id if match.player1_id == player_id else match.player1_id
        opponent = db.get(Player, opponent_id)
        opp_initial = opponent.initial_rating if opponent else rating.DEFAULT_RATING

        if match.player1_id == player_id:
            pg, og = match.player1_games, match.player2_games
        else:
            pg, og = match.player2_games, match.player1_games

        cumulative.append(
            rating.MatchRecord(
                match_id=match.id,
                opponent_rating=opp_initial,
                player_games=pg,
                opponent_games=og,
                match_format=match.match_format,
                played_at=match.played_at,
                opponent_match_count=0,
            )
        )
        result = rating.compute_player_rating(cumulative, player.initial_rating, match.played_at)
        history.append(
            {
                "date": match.played_at.isoformat(),
                "rating": result.rating,
                "match_id": match.id,
            }
        )

    return history
