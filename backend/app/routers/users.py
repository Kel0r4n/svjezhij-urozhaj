from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import (
    UserRegister, UserLogin, TokenResponse, RefreshTokenRequest,
    ForgotPasswordRequest, ForgotPasswordResponse, UserUpdate, UserResponse,
    normalize_phone,
)
from ..auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_token, get_current_user,
)
from ..utils import generate_temp_password

router = APIRouter(prefix="/auth", tags=["auth"])
profile_router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.phone == data.phone).first():
        raise HTTPException(status_code=400, detail="Телефон уже зарегистрирован")
    if data.email and db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        patronymic=data.patronymic,
        phone=data.phone,
        email=data.email,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _find_user_by_login(db: Session, login: str) -> User | None:
    value = login.strip()
    if "@" in value:
        return db.query(User).filter(User.email.ilike(value)).first()
    try:
        phone = normalize_phone(value)
    except ValueError:
        phone = value
    return db.query(User).filter(User.phone == phone).first()


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = _find_user_by_login(db, data.login)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Неверный email, телефон или пароль")
    token_data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Неверный тип токена")
    user = db.query(User).filter(User.id == int(payload.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    token_data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = _find_user_by_login(db, data.login)
    if not user:
        return ForgotPasswordResponse(
            message="Если аккаунт существует, обратитесь к администратору для восстановления пароля."
        )
    new_password = generate_temp_password()
    user.hashed_password = hash_password(new_password)
    db.commit()
    return ForgotPasswordResponse(
        message="Новый временный пароль сгенерирован. Сохраните его и смените после входа.",
        new_password=new_password,
    )


@profile_router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@profile_router.patch("/me", response_model=UserResponse)
def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.phone and data.phone != current_user.phone:
        if db.query(User).filter(User.phone == data.phone, User.id != current_user.id).first():
            raise HTTPException(status_code=400, detail="Телефон уже используется")
        current_user.phone = data.phone
    if data.email is not None:
        if data.email and db.query(User).filter(User.email == data.email, User.id != current_user.id).first():
            raise HTTPException(status_code=400, detail="Email уже используется")
        current_user.email = data.email or None
    if data.first_name is not None:
        current_user.first_name = data.first_name
    if data.last_name is not None:
        current_user.last_name = data.last_name
    if data.patronymic is not None:
        current_user.patronymic = data.patronymic or None
    if data.telegram_username is not None:
        current_user.telegram_username = data.telegram_username
    db.commit()
    db.refresh(current_user)
    return current_user
