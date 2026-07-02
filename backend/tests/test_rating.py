"""Unit tests for the STR rating engine."""

from datetime import datetime, timedelta

from app.rating import (
    compute_match_ratings,
    compute_player_rating,
    expected_game_win_pct,
    MatchRecord,
)


def test_expected_game_win_pct_equal_ratings():
    assert abs(expected_game_win_pct(5.0, 5.0) - 0.5) < 0.01


def test_expected_game_win_pct_favorite():
    assert expected_game_win_pct(6.0, 5.0) > 0.5


def test_match_rating_upset_performance():
    # Lower-rated player wins more games than expected
    mr_low, mr_high = compute_match_ratings(4.0, 6.0, 10, 8)
    assert mr_low > 4.0
    assert mr_high < 6.0


def test_match_rating_blowout_win_by_favorite():
    # Favorite wins 12-2 but underperforms expected game-win % vs a 2.0 STR gap
    mr_fav, mr_dog = compute_match_ratings(6.0, 4.0, 12, 2)
    assert mr_fav < 6.0
    assert mr_dog > 4.0


def test_match_rating_close_loss_by_underdog():
    # Underdog loses 6-7 but wins more games than expected
    mr_dog, mr_fav = compute_match_ratings(4.0, 6.0, 7, 6)
    assert mr_dog > 4.0
    assert mr_fav < 6.0


def test_player_rating_from_matches():
    now = datetime.utcnow()
    records = [
        MatchRecord(1, 5.0, 6, 4, "best_of_3", now - timedelta(days=1), 5),
        MatchRecord(2, 5.2, 6, 3, "best_of_3", now - timedelta(days=3), 5),
        MatchRecord(3, 4.8, 7, 5, "best_of_3", now - timedelta(days=7), 4),
        MatchRecord(4, 5.1, 6, 4, "best_of_3", now - timedelta(days=14), 5),
        MatchRecord(5, 5.0, 6, 2, "best_of_3", now - timedelta(days=21), 5),
    ]
    result = compute_player_rating(records, initial_rating=5.0, reference=now)
    assert result.match_count == 5
    assert not result.is_projected
    assert 4.0 <= result.rating <= 7.0


def test_projected_with_few_matches():
    now = datetime.utcnow()
    records = [
        MatchRecord(1, 5.0, 6, 4, "best_of_3", now, 3),
    ]
    result = compute_player_rating(records, reference=now)
    assert result.is_projected
    assert result.match_count == 1
