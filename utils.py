import csv
import io
from datetime import datetime, timedelta
from flask import make_response
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from models import Task, TimeEntry, Category

def generate_csv_report(user, start_date=None, end_date=None):
    """Generate CSV report for user's tasks and time entries"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write headers
    writer.writerow(['Task Title', 'Category', 'Status', 'Priority', 'Time Spent (Hours)', 
                    'Created Date', 'Due Date', 'Completed Date'])
    
    # Query tasks
    query = Task.query.filter_by(user_id=user.id)
    if start_date:
        query = query.filter(Task.created_at >= start_date)
    if end_date:
        query = query.filter(Task.created_at <= end_date)
    
    tasks = query.all()
    
    for task in tasks:
        time_spent = task.total_time_spent() / 3600  # Convert to hours
        category_name = task.category.name if task.category else 'No Category'
        due_date = task.due_date.strftime('%Y-%m-%d %H:%M') if task.due_date else ''
        completed_date = task.completed_at.strftime('%Y-%m-%d %H:%M') if task.completed_at else ''
        
        writer.writerow([
            task.title,
            category_name,
            task.status.title(),
            task.priority.title(),
            f"{time_spent:.2f}",
            task.created_at.strftime('%Y-%m-%d %H:%M'),
            due_date,
            completed_date
        ])
    
    output.seek(0)
    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = f'attachment; filename=productivity_report_{datetime.now().strftime("%Y%m%d")}.csv'
    
    return response

def generate_pdf_report(user, start_date=None, end_date=None):
    """Generate PDF report for user's tasks and time entries"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    story.append(Paragraph("Productivity Report", title_style))
    story.append(Spacer(1, 12))
    
    # Report info
    info_style = styles['Normal']
    story.append(Paragraph(f"<b>User:</b> {user.username}", info_style))
    story.append(Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}", info_style))
    
    if start_date:
        story.append(Paragraph(f"<b>From:</b> {start_date.strftime('%Y-%m-%d')}", info_style))
    if end_date:
        story.append(Paragraph(f"<b>To:</b> {end_date.strftime('%Y-%m-%d')}", info_style))
    
    story.append(Spacer(1, 20))
    
    # Query tasks
    query = Task.query.filter_by(user_id=user.id)
    if start_date:
        query = query.filter(Task.created_at >= start_date)
    if end_date:
        query = query.filter(Task.created_at <= end_date)
    
    tasks = query.all()
    
    if tasks:
        # Tasks summary
        story.append(Paragraph("Tasks Summary", styles['Heading2']))
        story.append(Spacer(1, 12))
        
        # Prepare table data
        table_data = [['Task', 'Category', 'Status', 'Priority', 'Time Spent']]
        
        for task in tasks:
            time_spent = task.total_time_formatted()
            category_name = task.category.name if task.category else 'No Category'
            
            table_data.append([
                task.title[:30] + ('...' if len(task.title) > 30 else ''),
                category_name,
                task.status.title(),
                task.priority.title(),
                time_spent
            ])
        
        # Create table
        table = Table(table_data, colWidths=[2*inch, 1*inch, 1*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
        
        # Statistics
        story.append(Spacer(1, 20))
        story.append(Paragraph("Statistics", styles['Heading2']))
        story.append(Spacer(1, 12))
        
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.status == 'completed'])
        total_time = sum(t.total_time_spent() for t in tasks) / 3600  # Convert to hours
        
        story.append(Paragraph(f"<b>Total Tasks:</b> {total_tasks}", info_style))
        story.append(Paragraph(f"<b>Completed Tasks:</b> {completed_tasks}", info_style))
        story.append(Paragraph(f"<b>Completion Rate:</b> {(completed_tasks/total_tasks*100):.1f}%" if total_tasks > 0 else "0%", info_style))
        story.append(Paragraph(f"<b>Total Time Tracked:</b> {total_time:.2f} hours", info_style))
    else:
        story.append(Paragraph("No tasks found for the selected period.", styles['Normal']))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    response = make_response(buffer.getvalue())
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename=productivity_report_{datetime.now().strftime("%Y%m%d")}.pdf'
    
    return response

def get_productivity_stats(user, days=30):
    """Get productivity statistics for the user"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get tasks created in the period
    tasks = Task.query.filter(
        Task.user_id == user.id,
        Task.created_at >= start_date,
        Task.created_at <= end_date
    ).all()
    
    # Get time entries for the period
    time_entries = TimeEntry.query.filter(
        TimeEntry.user_id == user.id,
        TimeEntry.start_time >= start_date,
        TimeEntry.start_time <= end_date
    ).all()
    
    # Calculate statistics
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == 'completed'])
    total_time = sum(entry.duration or 0 for entry in time_entries)
    
    # Tasks by status
    tasks_by_status = {
        'pending': len([t for t in tasks if t.status == 'pending']),
        'in_progress': len([t for t in tasks if t.status == 'in_progress']),
        'completed': completed_tasks
    }
    
    # Tasks by priority
    tasks_by_priority = {
        'low': len([t for t in tasks if t.priority == 'low']),
        'medium': len([t for t in tasks if t.priority == 'medium']),
        'high': len([t for t in tasks if t.priority == 'high'])
    }
    
    # Time by category
    time_by_category = {}
    for entry in time_entries:
        if entry.task and entry.task.category:
            category_name = entry.task.category.name
            time_by_category[category_name] = time_by_category.get(category_name, 0) + (entry.duration or 0)
        else:
            time_by_category['No Category'] = time_by_category.get('No Category', 0) + (entry.duration or 0)
    
    # Daily activity for the last 7 days
    daily_activity = {}
    for i in range(7):
        date = (end_date - timedelta(days=i)).date()
        daily_entries = [e for e in time_entries if e.start_time.date() == date]
        daily_time = sum(entry.duration or 0 for entry in daily_entries)
        daily_activity[date.strftime('%Y-%m-%d')] = daily_time / 3600  # Convert to hours
    
    return {
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'completion_rate': (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
        'total_time_hours': total_time / 3600,
        'tasks_by_status': tasks_by_status,
        'tasks_by_priority': tasks_by_priority,
        'time_by_category': time_by_category,
        'daily_activity': daily_activity
    }

def format_duration(seconds):
    """Format duration in seconds to human readable format"""
    if not seconds:
        return "0m"
    
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    
    if hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m"
