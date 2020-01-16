import os

"""Import flask framework functions to set up server-side functionality"""
from flask import Flask, flash, jsonify, request, session, redirect, render_template, abort
from flask_session import Session

"""Werkzeug: Password hashing and error handling"""
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.exceptions import default_exceptions, HTTPException, InternalServerError

"""Attach additional required functions/databases"""
from flask_mysqldb import MySQL
import yaml
import mysql.connector
from helpers import login_required
from tempfile import mkdtemp
import datetime
from datetime import date, timedelta
from collections import defaultdict
import sqlalchemy

"""Initialize Flask"""
app = Flask(__name__)

"""Configure MySQL Database with Flask"""
# Open yaml file containing db connection information (good practice for securing login info)
dbvars = yaml.load(open('db.yaml'))

'''Old way of instantiating database through TCP connection'''
# Load yaml file information into server configuration parameters to connect to database
# app.config['MYSQL_HOST'] = dbvars['mysql_host']
# app.config['MYSQL_USER'] = dbvars['mysql_user']
# app.config['MYSQL_PASSWORD'] = dbvars['mysql_password']
# app.config['MYSQL_DB'] = dbvars['mysql_db']

# Instantiate database object and cursor
# mysql = MySQL(app)

'''Using Unix Domain socket and SQLAlchemy Engine to instantiate database'''
# Source: https://cloud.google.com/sql/docs/mysql/connect-app-engine
dbsource = sqlalchemy.create_engine(
    # Equivalent URL:
    # mysql+pymysql://<db_user>:<db_pass>@/<db_name>?unix_socket=/cloudsql/<cloud_sql_instance_name>
    sqlalchemy.engine.url.URL(
        drivername="mysql+pymysql",
        username=dbvars['db_user'],
        password=dbvars['db_pass'],
        database=dbvars['db_name'],
        query={"unix_socket": "/cloudsql/{}".format(dbvars['cloud_sql_connection_name'])},
    ),
)

# Global db variable to handle all SQL queries
db = dbsource.connect()

# Configure session to use filesystem (instead of signed cookies)
app.secret_key = 'secret_key'
app.config["SESSION_FILE_DIR"] = mkdtemp()
app.config["SESSION_PERMANENT"] = False

# Ensure templates are auto-reloaded
app.config['SESSION_TYPE'] = 'filesystem'
app.config["TEMPLATES_AUTO_RELOAD"] = True

# Ensure responses aren't cached
@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response

"""Routes"""
@app.route("/", methods=["GET"])
@login_required
def graph():
    # Data point: Number of completed vs. in progress tasks
    completedTaskQuery = sqlalchemy.text("SELECT * FROM tasks WHERE id = :user_id AND completed = 1")
    completedCount = len(db.execute(completed, user_id=session["user_id"]).fetchall())
    
    incompleteTaskQuery = sqlalchemy.text("SELECT * FROM tasks WHERE id = :user_id AND completed = 0")
    progressCount = len(db.execute(incompleteTaskQuery, user_id=session["user_id"]).fetchall())
    
    '''Graph setup: taskCreations graph'''
    completedDates = []
    for row in db.execute(completedTaskQuery, user_id=session["user_id"]).fetchall():
        # Extract completion dates from position 5 in each completed task tuple
        completedDates.append(row[5])
    
    formattedDates = []
    for date in completedDates:
        monthName = date.strftime("%b")
        dayNum = date.day
        formattedDates.append(monthName + " " + str(dayNum))
    
    # Create list of consecutive dates over relevant range
    # Future Enhancement: Allow user to set these values through GET request
    dateMin = min(completedDates)
    dateMax = datetime.date.today()
    
    formattedDateAxisList = []
    dateAxisInterval = 1
        
    # Fill formattedDateAxisList with dates ranging between dateMin and dateMax
    nextDate = dateMin
    while nextDate <= dateMax:
        formattedNextDate = (nextDate.strftime("%b") + " " + str(nextDate.day))        
        formattedDateAxisList.append(formattedNextDate)
        nextDate += timedelta(days=dateAxisInterval)
    
    # Count occurrence of each date between min and max in formattedDates list
    taskCompleteCount = []
    for date in formattedDateAxisList:
        taskCompleteCount.append(formattedDates.count(date))
    
    # Create formatted data structure for dates line graph
    taskCompleteDataDictList = []
    for i in range(len(taskCompleteCount)):
        taskCompleteDataDictList.append({'name': formattedDateAxisList[i], 'y': taskCompleteCount[i]})
    
    # Graph settings: taskCreations line graph
    chart1ID = 'taskCreations'
    chart1type = 'column'
    chart1height = 500
    chart1 = {"renderTo": chart1ID, "type": chart1type, "height": chart1height}
    series1 = [{"name": 'Tasks Completed', "data": taskCompleteDataDictList}]
    title1 = {"text": 'Task Completion Over Time'}
    xAxis1 = {"type": 'category'}
    
    
    '''Graph setup: categoriesBreakdown graph'''
    # Generate list of all unique category names from goals table
    catGetQuery = sqlalchemy.text('SELECT * FROM goals WHERE id=:user_id')
    catData = db.execute(catGetQuery, user_id=session["user_id"]).fetchall()
    
    categoriesRawList = [row[2] for row in catData]
    uniqueCats = []
    for cat in categoriesRawList:
        if cat not in uniqueCats:
            uniqueCats.append(cat)
    
    # Create 1st dataset by counting unique category occurrences in categoriesRawList
    catFreqDictList = [] # Put this in series2
    for uniqueCat in uniqueCats:
        yData = (categoriesRawList.count(uniqueCat)) #/len(categoriesRawList))*100
        catFreqDict = {'name': uniqueCat, 'y': yData, 'drilldown': uniqueCat}
        catFreqDictList.append(catFreqDict)
    
    # Generate list of all unique goal IDs from tasks table
    goalGetQuery = sqlalchemy.text('SELECT * FROM tasks WHERE id=:user_id')
    goalData = db.execute(goalGetQuery, user_id=session["user_id"]).fetchall()
    goalIDListRaw = [taskRow[1] for taskRow in goalData]
    
    
    # Map goals to their in-table primary keys in a dictionary to make goals countable
    goalIDDict = {}
    for goalIDRow in catData:
        goalIDDict.update({goalIDRow[1] : goalIDRow[4]})
        # Format of goalIDDict: {'GoalName1' : pk_col1, 'GoalName2' : pk_col2}
    
    # Create dictionary mapping list goals to their category - defaultdict allows creation of key-value pair if it doesn't exist yet
    categoryGoalDict = defaultdict(list)
    
    for row in catData:
        # For each row, append the goal to the list of goals (value) that correspond to the category (key)
        categoryGoalDict[row[2]].append([row[1]])
        # Format of categoryGoalDict: [{Category1 : [[GoalName1], [GoalName2]]}, {Category2 : [[GoalName3], [GoalName4]]}]
    
    # Add count of each goal to list within list within each dict value
    for category in categoryGoalDict:
        for goal in categoryGoalDict[category]:
            goal.append(goalIDListRaw.count(goalIDDict[goal[0]]))
            # Format of categoryGoalDict: [{Category1 : [[GoalName1, count], [GoalName2, count]]}, {Category2 : [[GoalName3, count], [GoalName4, count]]}]

    # Create 2nd dataset by pulling the appropriate data list from previously defined data dictionary
    categoryGoalDictList = []
    for category in categoryGoalDict:
        #Write new dictionary to categoryGoalDictList
        categoryGoalDictList.append({'name': category, 'id': category, 'data': categoryGoalDict[category]})
    
    
    # Graph settings: categoriesBreakdown donut chart
    chart2ID = 'categoriesBreakdown'
    chart2type = 'pie'
    chart2height = 400
    chart2 = {"renderTo": chart2ID, "type": chart2type, "height": chart2height}
    series2 = [{"name": 'Categories', "data": catFreqDictList}]
    drilldown2 = {"series": categoryGoalDictList}
    title2 = {"text": 'Goal Categories'}
    subtitle2 = {"text": 'Click the slices to view category details'}
    
    
    return render_template("home.html", completedCount=completedCount, progressCount=progressCount,
                           chart1ID=chart1ID, chart1=chart1, series1=series1, title1=title1, xAxis1=xAxis1,
                           chart2ID=chart2ID, chart2=chart2, series2=series2, title2=title2, drilldown2=drilldown2, subtitle2=subtitle2)
    

@app.route("/login", methods=["GET", "POST"])
def login():
    """Log user in"""

    # Forget any user_id
    session.clear()

    # User reached route via POST (as by submitting a form via POST)
    if request.method == "POST":

        # Ensure username was submitted
        if not request.form.get("username"):
            abort(403, "Must provide username")

        # Ensure password was submitted
        elif not request.form.get("password"):
            abort(403, "Must provide password")
    
        # Query database for username
        loginQuery = sqlalchemy.text('SELECT * FROM users WHERE username=:username')
        userRow = db.execute(loginQuery, username=request.form.get("username")).fetchone()

        # Ensure username exists and password is correct
        if userRow is None or not check_password_hash(userRow[2], request.form.get("password")):
            abort(403, "Invalid username or password")

        # Remember which user has logged in
        session["user_id"] = userRow[0]

        # Redirect user to home page
        flash("Login successful!")
        return redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    """Register user"""
    if request.method == "POST":
        
        # Registration form validation for username and password
        username = request.form.get("username")
        password = request.form.get("password")
        defaultPic = '/static/Default.jpeg'
        confirmation = request.form.get("confirmation")
        created = datetime.date.today()
        
        URQuery = sqlalchemy.text('SELECT * FROM users WHERE username=:username')
        db.execute(URQuery, username=username)
        
        if not request.form.get("username") or not request.form.get("password"):
            abort(400, "Must enter valid username and/or password")
            
        elif URcursor.fetchone() is not None:
            abort(400, "Username is taken")
            
        # Check if new username matches existing usernames in database by counting number of matches - reject if count > 0
        elif request.form.get("password") != request.form.get("confirmation"):
            abort(400, "Passwords must match")
        
        # Insert successfully registered new user into users database
        insertUserQuery = sqlalchemy.text('INSERT INTO users (username,hashpass,picture,created) VALUES (:username, :hashpass, :defaultpic, :created)')
        hashPass = generate_password_hash(password, method='pbkdf2:sha256', salt_length=8)
        db.execute(insertUserQuery, username=username, hashpass=hashPass, defaultpic=defaultPic, created=created)
        
        # Keep user logged in after registration
        SessQuery = sqlalchemy.text('SELECT * FROM users WHERE username=:username')
        userRow = db.execute(SessQuery, username=username).fetchone()
        session["user_id"] = userRow[0]

        flash("Registered!")
        return redirect("/")

    # User reached route via GET
    else:
        return render_template("register.html")


@app.route("/check", methods=["GET"])
def check():
    """Return true if username available, else false, in JSON format to enable JS client-side handling of repeat usernames upon registration"""

    username = request.args.get("username")
    checkNameQuery = sqlalchemy.text('SELECT username FROM users WHERE username = :username')
    checkResult = db.execute(checkNameQuery, username=username).fetchone()
    
    # False case: username is already in database
    if not username or (len(username) >= 1 and checkResult is not None):
        return jsonify(False)
    # True case
    else:
        return jsonify(True)


@app.route("/planning", methods=["GET", "POST"])
@login_required
def planning():
    """Import user-entered goal entries into database"""
    if request.method == "POST":
        
        # Instantiate objects for posted form results by name
        goal = request.form.get("goalInput")
        category = request.form.get("categoryInput")
        deadline = request.form.get("datePicker")
        
        # Write object values into database
        goalWriteQuery = sqlalchemy.text('''INSERT INTO goals (id, goalname, category, deadline) 
                                         VALUES (:user_id, :goal, :category, :deadline)''')
        db.execute(goalWriteQuery, user_id=session["user_id"], goal=goal, category=category, deadline=deadline)
        
        return redirect("/planning")
    
    else:    

        # Select all goals created by user and instantiate list of rows returned
        goalDisplayQuery = sqlalchemy.text('SELECT * from goals WHERE id=:user_id')
        rows = list(db.execute(goalDisplayQuery, user_id=session["user_id"]).fetchall())

        # Create dictionary to store unique goal names, goal id's and goal categories
        goalDict = {'goals': [], 'goalids': [], 'categories': []}
        for row in rows:
            goalDict['goals'].append(row[1])
            goalDict['goalids'].append(row[4])
            
            # Goal categories can be repeated in database, sort uniq
            if row[2] not in goalDict['categories']:
                goalDict['categories'].append(row[2])
        
        # Pull all tasks from database
        taskDisplayQuery = sqlalchemy.text('SELECT * from tasks WHERE id = :user_id')
        taskrows = list(db.execute(taskDisplayQuery, user_id=session["user_id"]).fetchall())
        
        return render_template("planning.html", goals=goals, categories=categories, goalids=goalids, rows=rows, taskrows=taskrows)


@app.route("/createtask", methods=["GET"])
@login_required
def createtask():
    """ Insert new user-generated task into database """
    
    # Read goal_id and taskname from HTML
    goal_id = request.args.get("goalID")
    taskName = request.args.get("taskName")
    
    taskInsertQuery = sqlalchemy.text("""INSERT INTO tasks (id, goalID, taskname, date_created)
                             VALUES (:user_id, :goalID, :taskname, :date_created)""")
    db.execute(taskInsertQuery, user_id=session["user_id"], goalID=goal_id, taskname=taskName, date_created=datetime.date.today())
    
    # Retrieve id of newly created task
    taskIDGetQuery = sqlalchemy.text('SELECT taskID FROM tasks WHERE goalID = :goalID AND taskname = :taskname')
    task_id = db.execute(taskIDGetQuery, goalID=goal_id, taskname=taskName).fetchall()
    
    return jsonify(task_id)

@app.route("/goalupdate", methods=["POST"])
@login_required
def goalupdate():
    """ Retrieve information about goals/tasks after user-saved updates and update database """
    goalID = request.form.get('updatedGoalID')
    
    if request.form.get('goalDisplayName'):
        # Read goal name, category, and deadline, apply changes for goalID
        goalName = request.form.get('goalDisplayName')
        categoryName = request.form.get('goalDisplayCat')
        deadline = request.form.get('goalDisplayDate')

        goalsUpdateStmnt = sqlalchemy.text('''UPDATE goals SET goalname=:goalName, 
                                           category=:categoryName, deadline=:deadline WHERE pk_col=:goalID''')
        db.execute(goalsUpdateStmnt, goalName=goalName, categoryName=categoryName, deadline=deadline, goalID=goalID)

        # Read new task names and apply changes for corresponding taskID
        taskIDs = request.form.getlist('updatedTaskIDs')
        updatedTaskNames = request.form.getlist('taskname')
        taskNameUpdateStmnt = sqlalchemy.text('UPDATE tasks SET taskname=:taskname WHERE taskid=:taskid')

        for n in range(len(updatedTaskNames)):
            taskNameUpdateCursor.execute(taskNameUpdateStmnt, taskname=updatedTaskNames[n], taskid=taskIDs[n])

    # Get id's of checked tasks from checkedTaskList input forms
    checkedTaskList = request.form.getlist('checkeditem')
    uncheckedTaskList = request.form.getlist('uncheckeditem')
    
    # Update tasks to checked in tasks database for each matching id
    taskReadQuery = sqlalchemy.text('SELECT completed FROM tasks WHERE taskID = :checkedTaskID')
    checkedTaskUpdateStmnt = sqlalchemy.text('UPDATE tasks SET completed=1, date_completed=:today WHERE taskID=:checkedTaskID')
    uncheckedTaskUpdateStmnt = sqlalchemy.text('UPDATE tasks SET completed=0, date_completed=NULL WHERE taskID = :uncheckedTaskID')
    
    for checked_task_id in checkedTaskList:
        ''' Update completed tasks and add completed date '''
       
        # Ensure updates are only made to tasks that were previously uncompleted, leave already completed ones alone
        if db.execute(taskReadQuery, checkedTaskID=checked_task_id).fetchone() == (0,):
            db.execute(checkedTaskUpdateStmnt, today=datetime.date.today(), taskID=checked_task_id)
        
    for unchecked_task_id in uncheckedTaskList:
        # Update unchecked tasks and delete completed date
        taskUpdateCursor.execute(uncheckedTaskUpdateStmnt, uncheckedTaskID=unchecked_task_id])
    
    return redirect('/planning')
    

@app.route("/delete", methods=["GET"])
@login_required
def delete():
    """Find goal row corresponding to id from GET and remove from database"""
    if request.args.get("goalID"):
        goalID = request.args.get("goalID")
        goalDeleteCursor = mysql.connection.cursor()
        goalDeleteCursor.execute("DELETE FROM goals WHERE pk_col = %s", [goalID])
        goalDeleteCursor.connection.commit()
        goalDeleteCursor.close()
        return redirect("/planning")
    
    elif request.args.get("taskID"):
        taskID = request.args.get("taskID")
        taskDeleteCursor = mysql.connection.cursor()
        taskDeleteCursor.execute("DELETE FROM tasks WHERE taskID = %s", [taskID])
        taskDeleteCursor.connection.commit()
        taskDeleteCursor.close()
        return redirect("/planning")


@app.route("/profile", methods=["GET"])
@login_required
def profile():
    """Display user info and allow user to change their password or add funds"""
    userCursor = mysql.connection.cursor()
    userCursor.execute("SELECT * from users WHERE id = %s", [session["user_id"]])
    userRow = userCursor.fetchone()
    userCursor.close()
    
    # Get username, proPic, and profile age from session user row
    username = userRow[1]
    proPic = userRow[3]
    age = (datetime.date.today() - userRow[4]).days
    
    return render_template("profile.html", username=username, age=age, proPic=proPic)

@app.route("/profilechange", methods=["POST"])
@login_required
def profilechange():
    """Allow user to change profile picture and password in database"""
    
    #Get picture URL from hidden text field in profile and store in database
    if request.form.get("picURL"):
        proPic = request.form.get("picURL")
        # Update user profile picture in database
        picCursor = mysql.connection.cursor()
        picCursor.execute("UPDATE users SET picture= %s WHERE id= %s", [proPic, session["user_id"]])
        picCursor.connection.commit()
        picCursor.close()
        
        flash("Profile picture saved!")
        return redirect("/profile")
    
    if request.form.get("newpassword"):
        newpass = request.form.get("newpassword")
        hashpass = generate_password_hash(newpass, method='pbkdf2:sha256', salt_length=8)
        
        passCursor = mysql.connection.cursor()
        passCursor.execute("UPDATE users SET hashpass=%s WHERE id=%s", [hashpass, session["user_id"]])
        passCursor.connection.commit()
        passCursor.close()
        
        flash("Password changed!")
        return redirect("/profile")

@app.route("/logout")
def logout():
    """Log user out"""
    # Forget any user_id
    session.clear()

    # Redirect user to login form
    return redirect("/")


@app.errorhandler(HTTPException)
def errorhandler(error):
    """Handle errors"""
    return render_template("error.html", error=error)

# https://github.com/pallets/flask/pull/2314
for code in default_exceptions:
    app.errorhandler(code)(errorhandler)


if __name__ == '__main__':
    
    app.run(debug=True)