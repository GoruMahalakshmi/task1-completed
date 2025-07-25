from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, SelectField, DateTimeField, PasswordField, SubmitField, HiddenField
from wtforms.validators import DataRequired, Email, Length, EqualTo, Optional
from wtforms.widgets import DateTimeLocalInput
from models import Category

class LoginForm(FlaskForm):
    """Login form"""
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=80)])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Sign In')

class RegisterForm(FlaskForm):
    """Registration form"""
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=80)])
    email = StringField('Email', validators=[DataRequired(), Email(), Length(max=120)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    password2 = PasswordField('Confirm Password', 
                             validators=[DataRequired(), EqualTo('password', message='Passwords must match')])
    submit = SubmitField('Register')

class TaskForm(FlaskForm):
    """Task creation and editing form"""
    title = StringField('Title', validators=[DataRequired(), Length(max=200)])
    description = TextAreaField('Description', validators=[Optional()])
    category_id = SelectField('Category', coerce=int, validators=[Optional()])
    priority = SelectField('Priority', 
                          choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')],
                          default='medium')
    due_date = DateTimeField('Due Date', 
                            validators=[Optional()],
                            widget=DateTimeLocalInput(),
                            format='%Y-%m-%dT%H:%M')
    submit = SubmitField('Save Task')
    
    def __init__(self, user=None, *args, **kwargs):
        super(TaskForm, self).__init__(*args, **kwargs)
        if user:
            # Populate category choices for the current user
            self.category_id.choices = [(0, 'No Category')] + [
                (c.id, c.name) for c in Category.query.filter_by(user_id=user.id).all()
            ]

class CategoryForm(FlaskForm):
    """Category creation and editing form"""
    name = StringField('Category Name', validators=[DataRequired(), Length(max=100)])
    color = StringField('Color', validators=[DataRequired(), Length(min=7, max=7)], 
                       render_kw={"type": "color", "value": "#007bff"})
    submit = SubmitField('Save Category')

class TimeEntryForm(FlaskForm):
    """Time entry form for manual time logging"""
    task_id = SelectField('Task', coerce=int, validators=[DataRequired()])
    start_time = DateTimeField('Start Time', 
                              validators=[DataRequired()],
                              widget=DateTimeLocalInput(),
                              format='%Y-%m-%dT%H:%M')
    end_time = DateTimeField('End Time', 
                            validators=[DataRequired()],
                            widget=DateTimeLocalInput(),
                            format='%Y-%m-%dT%H:%M')
    description = TextAreaField('Description', validators=[Optional()])
    submit = SubmitField('Log Time')
    
    def __init__(self, user=None, *args, **kwargs):
        super(TimeEntryForm, self).__init__(*args, **kwargs)
        if user:
            # Populate task choices for the current user
            from models import Task
            self.task_id.choices = [
                (t.id, t.title) for t in Task.query.filter_by(user_id=user.id).all()
            ]

class TimerForm(FlaskForm):
    """Timer form for active time tracking"""
    task_id = HiddenField('Task ID', validators=[DataRequired()])
    action = HiddenField('Action', validators=[DataRequired()])  # start, pause, stop
    submit = SubmitField('Submit')
