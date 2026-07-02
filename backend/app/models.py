from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    initial_rating: Mapped[float] = mapped_column(Float, default=5.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    matches_as_player1: Mapped[list["Match"]] = relationship(
        "Match", foreign_keys="Match.player1_id", back_populates="player1"
    )
    matches_as_player2: Mapped[list["Match"]] = relationship(
        "Match", foreign_keys="Match.player2_id", back_populates="player2"
    )


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    player1_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    player2_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    played_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    # Total games won by each player across all sets
    player1_games: Mapped[int] = mapped_column(Integer)
    player2_games: Mapped[int] = mapped_column(Integer)

    # best_of_3 | pro_set | single_set | best_of_5
    match_format: Mapped[str] = mapped_column(String(32), default="best_of_3")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by: Mapped[str | None] = mapped_column(String(120), nullable=True)

    player1: Mapped["Player"] = relationship(
        "Player", foreign_keys=[player1_id], back_populates="matches_as_player1"
    )
    player2: Mapped["Player"] = relationship(
        "Player", foreign_keys=[player2_id], back_populates="matches_as_player2"
    )
