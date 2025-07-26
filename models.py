from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from . import db, login_manager

class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    tasks = db.relationship('Task', backref='user', lazy='dynamic')
    categories = db.relationship('Category', backref='user', lazy='dynamic')

    def set_password(self, password):
        """Hashes and sets the user's password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Checks the hashed password"""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'
class Category(db.Model):
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tasks = db.relationship('Task', backref='category', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Category {self.name}>'

class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    priority = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.Date, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True) 
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    time_entries = db.relationship('TimeEntry', backref='task', lazy='dynamic', cascade='all, delete-orphan')
    def total_time_spent(self):
        """Total time spent on task in seconds"""
        return sum(entry.duration or 0 for entry in self.time_entries)
    def total_time_formatted(self):
        """Formatted total time spent (HH:MM:00)"""
        total_seconds = self.total_time_spent()
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        return f"{hours:02d}:{minutes:02d}:00"
    def mark_completed(self):
        """Mark task as completed and timestamp it"""
        self.status = 'completed'
        self.completed_at = datetime.utcnow()

    def __repr__(self):
        return f'<Task {self.title}>'

class TimeEntry(db.Model):
    __tablename__ = 'time_entries'

    id = db.Column(db.Integer, primary_key=True)
    start_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    end_time = db.Column(db.DateTime, nullable=True)
    duration = db.Column(db.Integer, nullable=True) 

    # Foreign key
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=False)

    def duration_formatted(self):
        """Returns duration in HH:MM:SS format"""
        if self.duration is not None:
            hours = self.duration // 3600
            minutes = (self.duration % 3600) // 60
            seconds = self.duration % 60
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return "00:00:00"

    def __repr__(self):
        return f'<TimeEntry {self.id} for Task {self.task_id}>'

# -------------------- LOGIN MANAGER --------------------

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
