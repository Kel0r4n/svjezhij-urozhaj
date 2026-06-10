"""Умный поиск: нечувствителен к регистру, цифры телефона — подряд."""

from sqlalchemy import or_
from sqlalchemy.orm import Query

from .models import User


def extract_digits(value: str) -> str:
    return "".join(c for c in value if c.isdigit())


def apply_user_search(query: Query, search: str) -> Query:
    """Фильтр пользователей по имени/email и цифрам телефона (подряд)."""
    term = search.strip()
    if not term:
        return query

    digits = extract_digits(term)
    like = f"%{term}%"
    conditions = [
        User.first_name.ilike(like),
        User.last_name.ilike(like),
        User.patronymic.ilike(like),
        User.email.ilike(like),
    ]
    if digits:
        conditions.append(User.phone.ilike(f"%{digits}%"))
    else:
        conditions.append(User.phone.ilike(like))

    return query.filter(or_(*conditions))


def product_search_filter(name_column, search: str):
    """Условие поиска товара по названию (без учёта регистра)."""
    term = search.strip()
    if not term:
        return None
    return name_column.ilike(f"%{term}%")
