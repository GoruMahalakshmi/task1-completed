from datetime import datetime, timedelta
from flask import render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from urllib.parse import urlparse
from app import app, db
from models import User, Task, Category, TimeEntry
from forms import LoginForm, RegisterForm, TaskForm, CategoryForm, TimeEntryForm, TimerForm
from utils import generate_csv_report, generate_pdf_report, get_productivity_stats

@app.route('/')
def index():
    """Home page - redirects to dashboard if logged in"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            login_user(user)
            flash('Login successful!', 'success')
            
            # Redirect to the page user was trying to access
            next_page = request.args.get('next')
            if not next_page or urlparse(next_page).netloc != '':
                next_page = url_for('dashboard')
            return redirect(next_page)
        else:
            flash('Invalid username or password', 'error')
    
    return render_template('login.html', form=form)

@app.route('/register', methods=['GET', 'POST'])
def register():
    """Registration page"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    form = RegisterForm()
    if form.validate_on_submit():
        # Check if username or email already exists
        existing_user = User.query.filter(
            (User.username == form.username.data) | (User.email == form.email.data)
        ).first()
        
        if existing_user:
            if existing_user.username == form.username.data:
                flash('Username already exists. Please choose a different one.', 'error')
            else:
                flash('Email already registered. Please use a different email.', 'error')
        else:
            # Create new user
            user = User(username=form.username.data, email=form.email.data)
            user.set_password(form.password.data)
            db.session.add(user)
            db.session.commit()
            
            # Create default categories
            default_categories = [
                {'name': 'Work', 'color': '#007bff'},
                {'name': 'Personal', 'color': '#28a745'},
                {'name': 'Learning', 'color': '#ffc107'},
                {'name': 'Health', 'color': '#dc3545'}
            ]
            
            for cat_data in default_categories:
                category = Category(name=cat_data['name'], color=cat_data['color'], user_id=user.id)
                db.session.add(category)
            
            db.session.commit()
            
            flash('Registration successful! You can now log in.', 'success')
            return redirect(url_for('login'))
    
    return render_template('register.html', form=form)

@app.route('/logout')
@login_required
def logout():
    """Logout"""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    """Main dashboard"""
    # Get recent tasks
    recent_tasks = Task.query.filter_by(user_id=current_user.id).order_by(Task.created_at.desc()).limit(5).all()
    
    # Get active time entries (not completed)
    active_entries = TimeEntry.query.filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.end_time.is_(None)
    ).all()
    
    # Get productivity stats
    stats = get_productivity_stats(current_user, days=7)  # Last 7 days
    
    return render_template('dashboard.html', 
                         recent_tasks=recent_tasks, 
                         active_entries=active_entries,
                         stats=stats)

@app.route('/tasks')
@login_required
def tasks():
    """Tasks management page"""
    # Get filter parameters
    status_filter = request.args.get('status', 'all')
    category_filter = request.args.get('category', 'all')
    priority_filter = request.args.get('priority', 'all')
    
    # Build query
    query = Task.query.filter_by(user_id=current_user.id)
    
    if status_filter != 'all':
        query = query.filter_by(status=status_filter)
    if category_filter != 'all':
        query = query.filter_by(category_id=int(category_filter))
    if priority_filter != 'all':
        query = query.filter_by(priority=priority_filter)
    
    # Get tasks ordered by creation date
    user_tasks = query.order_by(Task.created_at.desc()).all()
    
    # Get user categories for filter dropdown
    categories = Category.query.filter_by(user_id=current_user.id).all()
    
    return render_template('tasks.html', 
                         tasks=user_tasks, 
                         categories=categories,
                         current_filters={
                             'status': status_filter,
                             'category': category_filter,
                             'priority': priority_filter
                         })

@app.route('/tasks/new', methods=['GET', 'POST'])
@login_required
def new_task():
    """Create new task"""
    form = TaskForm(user=current_user)
    
    if form.validate_on_submit():
        task = Task(
            title=form.title.data,
            description=form.description.data,
            priority=form.priority.data,
            due_date=form.due_date.data,
            user_id=current_user.id
        )
        
        if form.category_id.data and form.category_id.data != 0:
            task.category_id = form.category_id.data
        
        db.session.add(task)
        db.session.commit()
        
        flash('Task created successfully!', 'success')
        return redirect(url_for('tasks'))
    
    return render_template('tasks.html', form=form, task=None)

@app.route('/tasks/<int:task_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_task(task_id):
    """Edit existing task"""
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    form = TaskForm(user=current_user, obj=task)
    
    if form.validate_on_submit():
        task.title = form.title.data
        task.description = form.description.data
        task.priority = form.priority.data
        task.due_date = form.due_date.data
        task.updated_at = datetime.utcnow()
        
        if form.category_id.data and form.category_id.data != 0:
            task.category_id = form.category_id.data
        else:
            task.category_id = None
        
        db.session.commit()
        
        flash('Task updated successfully!', 'success')
        return redirect(url_for('tasks'))
    
    return render_template('tasks.html', form=form, task=task)

@app.route('/tasks/<int:task_id>/delete', methods=['POST'])
@login_required
def delete_task(task_id):
    """Delete task"""
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    db.session.delete(task)
    db.session.commit()
    
    flash('Task deleted successfully!', 'success')
    return redirect(url_for('tasks'))

@app.route('/tasks/<int:task_id>/complete', methods=['POST'])
@login_required
def complete_task(task_id):
    """Mark task as completed"""
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    task.mark_completed()
    db.session.commit()
    
    flash('Task marked as completed!', 'success')
    return redirect(url_for('tasks'))

@app.route('/timer')
@login_required
def timer():
    """Time tracking page"""
    # Get user tasks for timer selection
    user_tasks = Task.query.filter_by(user_id=current_user.id).all()
    
    # Get active timer session
    active_entry = TimeEntry.query.filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.end_time.is_(None)
    ).first()
    
    return render_template('timer.html', tasks=user_tasks, active_entry=active_entry)

@app.route('/timer/start', methods=['POST'])
@login_required
def start_timer():
    """Start timer for a task"""
    task_id = request.form.get('task_id')
    
    if not task_id:
        flash('Please select a task to start timing.', 'error')
        return redirect(url_for('timer'))
    
    # Check if there's already an active timer
    active_entry = TimeEntry.query.filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.end_time.is_(None)
    ).first()
    
    if active_entry:
        flash('You already have an active timer. Please stop it first.', 'warning')
        return redirect(url_for('timer'))
    
    # Verify task belongs to user
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
    if not task:
        flash('Task not found.', 'error')
        return redirect(url_for('timer'))
    
    # Create new time entry
    time_entry = TimeEntry(
        start_time=datetime.utcnow(),
        user_id=current_user.id,
        task_id=task_id
    )
    
    # Update task status to in_progress if it's pending
    if task.status == 'pending':
        task.status = 'in_progress'
    
    db.session.add(time_entry)
    db.session.commit()
    
    flash(f'Timer started for "{task.title}"', 'success')
    return redirect(url_for('timer'))

@app.route('/timer/stop', methods=['POST'])
@login_required
def stop_timer():
    """Stop active timer"""
    active_entry = TimeEntry.query.filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.end_time.is_(None)
    ).first()
    
    if not active_entry:
        flash('No active timer found.', 'error')
        return redirect(url_for('timer'))
    
    # Stop the timer
    active_entry.end_time = datetime.utcnow()
    active_entry.calculate_duration()
    
    db.session.commit()
    
    flash(f'Timer stopped. Duration: {active_entry.duration_formatted()}', 'success')
    return redirect(url_for('timer'))

@app.route('/categories', methods=['GET', 'POST'])
@login_required
def categories():
    """Manage categories"""
    form = CategoryForm()
    
    if form.validate_on_submit():
        category = Category(
            name=form.name.data,
            color=form.color.data,
            user_id=current_user.id
        )
        db.session.add(category)
        db.session.commit()
        
        flash('Category created successfully!', 'success')
        return redirect(url_for('categories'))
    
    user_categories = Category.query.filter_by(user_id=current_user.id).all()
    return render_template('categories.html', categories=user_categories, form=form)

@app.route('/categories/<int:category_id>/delete', methods=['POST'])
@login_required
def delete_category(category_id):
    """Delete category"""
    category = Category.query.filter_by(id=category_id, user_id=current_user.id).first_or_404()
    
    # Check if category has tasks
    if category.tasks:
        flash('Cannot delete category with existing tasks. Please reassign or delete tasks first.', 'error')
    else:
        db.session.delete(category)
        db.session.commit()
        flash('Category deleted successfully!', 'success')
    
    return redirect(url_for('categories'))

@app.route('/analytics')
@login_required
def analytics():
    """Analytics and reports page"""
    # Get productivity stats for different periods
    stats_7d = get_productivity_stats(current_user, days=7)
    stats_30d = get_productivity_stats(current_user, days=30)
    
    return render_template('analytics.html', 
                         stats_7d=stats_7d, 
                         stats_30d=stats_30d)

@app.route('/reports')
@login_required
def reports():
    """Reports page"""
    return render_template('reports.html')

@app.route('/reports/csv')
@login_required
def export_csv():
    """Export data as CSV"""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    start_date = datetime.strptime(start_date_str, '%Y-%m-%d') if start_date_str else None
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d') if end_date_str else None
    
    return generate_csv_report(current_user, start_date, end_date)

@app.route('/reports/pdf')
@login_required
def export_pdf():
    """Export data as PDF"""
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    start_date = datetime.strptime(start_date_str, '%Y-%m-%d') if start_date_str else None
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d') if end_date_str else None
    
    return generate_pdf_report(current_user, start_date, end_date)

# API endpoints for AJAX requests
@app.route('/api/timer/status')
@login_required
def timer_status():
    """Get current timer status"""
    active_entry = TimeEntry.query.filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.end_time.is_(None)
    ).first()
    
    if active_entry:
        elapsed_seconds = (datetime.utcnow() - active_entry.start_time).total_seconds()
        return jsonify({
            'active': True,
            'task_id': active_entry.task_id,
            'task_title': active_entry.task.title,
            'elapsed_seconds': int(elapsed_seconds),
            'start_time': active_entry.start_time.isoformat()
        })
    else:
        return jsonify({'active': False})

@app.route('/api/stats')
@login_required
def api_stats():
    """Get productivity statistics for charts"""
    days = request.args.get('days', 30, type=int)
    stats = get_productivity_stats(current_user, days=days)
    return jsonify(stats)

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500
