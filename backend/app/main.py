from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import get_allowed_origins
from .database import Base, engine, get_db
from .models import Match, Player
from .schemas import (
    LeaderboardEntry,
    MatchCreate,
    MatchOut,
    MatchUpdate,
    PlayerCreate,
    PlayerDetail,
    PlayerOut,
    PlayerUpdate,
)
from .services import (
    build_rating_history,
    compute_all_ratings,
    get_player_rating,
    match_to_out,
    sum_games_from_sets,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Saville Tennis Ranking",
    description="Local club tennis ranking system inspired by UTR",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "system": "Saville Tennis Ranking"}


@app.get("/api/players", response_model=list[PlayerOut])
def list_players(db: Session = Depends(get_db)):
    players = db.query(Player).order_by(Player.name).all()
    ratings = compute_all_ratings(db)
    return [
        PlayerOut(
            id=p.id,
            name=p.name,
            email=p.email,
            initial_rating=p.initial_rating,
            str_rating=ratings[p.id].rating if p.id in ratings else p.initial_rating,
            is_projected=ratings[p.id].is_projected if p.id in ratings else True,
            match_count=ratings[p.id].match_count if p.id in ratings else 0,
            created_at=p.created_at,
        )
        for p in players
    ]


@app.post("/api/players", response_model=PlayerOut, status_code=201)
def create_player(payload: PlayerCreate, db: Session = Depends(get_db)):
    existing = db.query(Player).filter(Player.name.ilike(payload.name.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="A player with this name already exists")

    player = Player(
        name=payload.name.strip(),
        email=payload.email,
        initial_rating=payload.initial_rating,
    )
    db.add(player)
    db.commit()
    db.refresh(player)

    return PlayerOut(
        id=player.id,
        name=player.name,
        email=player.email,
        initial_rating=player.initial_rating,
        str_rating=player.initial_rating,
        is_projected=True,
        match_count=0,
        created_at=player.created_at,
    )


@app.patch("/api/players/{player_id}", response_model=PlayerOut)
def update_player(player_id: int, payload: PlayerUpdate, db: Session = Depends(get_db)):
    player = db.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    if payload.name is not None:
        name = payload.name.strip()
        existing = (
            db.query(Player)
            .filter(Player.name.ilike(name), Player.id != player_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="A player with this name already exists")
        player.name = name

    if payload.email is not None:
        player.email = payload.email.strip() or None

    if payload.initial_rating is not None:
        player.initial_rating = payload.initial_rating

    db.commit()
    db.refresh(player)

    rating_result = get_player_rating(db, player_id)
    return PlayerOut(
        id=player.id,
        name=player.name,
        email=player.email,
        initial_rating=player.initial_rating,
        str_rating=rating_result.rating,
        is_projected=rating_result.is_projected,
        match_count=rating_result.match_count,
        created_at=player.created_at,
    )


@app.delete("/api/players/{player_id}", status_code=204)
def delete_player(player_id: int, db: Session = Depends(get_db)):
    player = db.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    match_count = (
        db.query(Match)
        .filter((Match.player1_id == player_id) | (Match.player2_id == player_id))
        .count()
    )
    if match_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a player with match history. Delete their matches first.",
        )

    db.delete(player)
    db.commit()


@app.get("/api/players/{player_id}", response_model=PlayerDetail)
def get_player(player_id: int, db: Session = Depends(get_db)):
    player = db.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    rating_result = get_player_rating(db, player_id)
    all_ratings = compute_all_ratings(db)

    matches = (
        db.query(Match)
        .filter((Match.player1_id == player_id) | (Match.player2_id == player_id))
        .order_by(Match.played_at.desc())
        .all()
    )

    recent = []
    for m in matches:
        p1 = db.get(Player, m.player1_id)
        p2 = db.get(Player, m.player2_id)
        p1_r = all_ratings[m.player1_id].rating if m.player1_id in all_ratings else p1.initial_rating
        p2_r = all_ratings[m.player2_id].rating if m.player2_id in all_ratings else p2.initial_rating
        recent.append(MatchOut(**match_to_out(m, p1.name, p2.name, p1_r, p2_r)))

    return PlayerDetail(
        id=player.id,
        name=player.name,
        email=player.email,
        initial_rating=player.initial_rating,
        str_rating=rating_result.rating,
        is_projected=rating_result.is_projected,
        match_count=rating_result.match_count,
        created_at=player.created_at,
        recent_matches=recent,
        rating_history=build_rating_history(db, player_id, player),
    )


@app.get("/api/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(db: Session = Depends(get_db)):
    players = db.query(Player).all()
    ratings = compute_all_ratings(db)

    entries = []
    for p in players:
        r = ratings.get(p.id)
        entries.append(
            LeaderboardEntry(
                rank=0,
                id=p.id,
                name=p.name,
                str_rating=r.rating if r else p.initial_rating,
                is_projected=r.is_projected if r else True,
                match_count=r.match_count if r else 0,
            )
        )

    entries.sort(key=lambda e: (-e.str_rating, -e.match_count, e.name.lower()))
    for i, entry in enumerate(entries, start=1):
        entry.rank = i
    return entries


@app.get("/api/matches", response_model=list[MatchOut])
def list_matches(limit: int = 50, db: Session = Depends(get_db)):
    matches = db.query(Match).order_by(Match.played_at.desc()).limit(limit).all()
    all_ratings = compute_all_ratings(db)
    result = []
    for m in matches:
        p1 = db.get(Player, m.player1_id)
        p2 = db.get(Player, m.player2_id)
        p1_r = all_ratings[m.player1_id].rating if m.player1_id in all_ratings else p1.initial_rating
        p2_r = all_ratings[m.player2_id].rating if m.player2_id in all_ratings else p2.initial_rating
        result.append(MatchOut(**match_to_out(m, p1.name, p2.name, p1_r, p2_r)))
    return result


@app.post("/api/matches", response_model=MatchOut, status_code=201)
def create_match(payload: MatchCreate, db: Session = Depends(get_db)):
    p1 = db.get(Player, payload.player1_id)
    p2 = db.get(Player, payload.player2_id)
    if not p1 or not p2:
        raise HTTPException(status_code=404, detail="One or both players not found")

    p1_games, p2_games = sum_games_from_sets(payload.sets)
    if p1_games + p2_games == 0:
        raise HTTPException(status_code=400, detail="Match must have at least one game played")

    match = Match(
        player1_id=payload.player1_id,
        player2_id=payload.player2_id,
        player1_games=p1_games,
        player2_games=p2_games,
        match_format=payload.match_format,
        played_at=payload.played_at or datetime.utcnow(),
        notes=payload.notes,
        recorded_by=payload.recorded_by,
    )
    db.add(match)
    db.commit()
    db.refresh(match)

    all_ratings = compute_all_ratings(db)
    p1_r = all_ratings[p1.id].rating
    p2_r = all_ratings[p2.id].rating

    return MatchOut(**match_to_out(match, p1.name, p2.name, p1_r, p2_r))


def _match_out(db: Session, match: Match) -> MatchOut:
    p1 = db.get(Player, match.player1_id)
    p2 = db.get(Player, match.player2_id)
    if not p1 or not p2:
        raise HTTPException(status_code=404, detail="Player not found for match")
    all_ratings = compute_all_ratings(db)
    p1_r = all_ratings[match.player1_id].rating if match.player1_id in all_ratings else p1.initial_rating
    p2_r = all_ratings[match.player2_id].rating if match.player2_id in all_ratings else p2.initial_rating
    return MatchOut(**match_to_out(match, p1.name, p2.name, p1_r, p2_r))


@app.get("/api/matches/{match_id}", response_model=MatchOut)
def get_match(match_id: int, db: Session = Depends(get_db)):
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return _match_out(db, match)


@app.patch("/api/matches/{match_id}", response_model=MatchOut)
def update_match(match_id: int, payload: MatchUpdate, db: Session = Depends(get_db)):
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if payload.player1_games is not None:
        match.player1_games = payload.player1_games
    if payload.player2_games is not None:
        match.player2_games = payload.player2_games
    if match.player1_games + match.player2_games == 0:
        raise HTTPException(status_code=400, detail="Match must have at least one game played")

    if payload.match_format is not None:
        match.match_format = payload.match_format
    if payload.played_at is not None:
        match.played_at = payload.played_at
    if payload.notes is not None:
        match.notes = payload.notes.strip() or None

    db.commit()
    db.refresh(match)
    return _match_out(db, match)


@app.delete("/api/matches/{match_id}", status_code=204)
def delete_match(match_id: int, db: Session = Depends(get_db)):
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    db.delete(match)
    db.commit()
