function goalmain() {
    /* Render text form if user selects "Create New" category */
    var createCat = document.getElementById("categoryInput");
    var goalForm = document.getElementById("goalForm");
    
    createCat.addEventListener('change', XMLRenderCat);
    
    /*Apply real-time checking of goalForm to prevent duplicate entries*/
    goalForm.onkeyup = goalFormValidate;
    
    // Separate validation of category selection since it doesn't involve typing
    
    // Returns error if user doesn't attempt to change category upon pop up load
    if (createCat.value === 'Choose Category' || createCat.value === 'Create New') {
        createCat.setCustomValidity('no category selected');
    }
    
    // Returns error if user makes a valid entry and switches back to an invalid entry
    createCat.onchange = function() {
        if (createCat.value === 'Choose Category' || createCat.value === 'Create New') {
            createCat.setCustomValidity('no category selected');
        }
        else {
            createCat.setCustomValidity('');
        }
    };
    
    /*Render interactive goal list using information pulled into HTML page by Flask*/
    
    // Start by creating necessary list of HTML elements
    goalElements = document.getElementsByClassName("goalName");
    goalIDElements = document.getElementsByClassName("goalItem");
    
    // Pair each goal id to its goal to put the correct text in each button, add delete button
    for (var i=0;i<goalElements.length;i++) {
        goalIDElements[i].innerHTML = goalElements[i].textContent + "<span class='goalDeleteButton'>&#9447;</span>";
    }
    
    /* Allow user to delete goal entries */
    
    // Allow user to see delete button if hovering over any goal buttons
    Object.entries(goalIDElements).map(( object ) => {
    
        // object[1] = array of all objects with class name attributed to goalIDElements
        object[1].addEventListener("mouseover", function(event) {
            activeButton = event.target;
            activeButton.childNodes[1].style.display = 'inline-block';
        });
        
        object[1].addEventListener("mouseleave", function(event) {
            activeButton = event.target;
            activeButton.childNodes[1].style.display = 'none';
        });
    });
    
    goalDeleteButtons = document.getElementsByClassName("goalDeleteButton");
    
    // Activate funciton to delete goal bucket upon clicking on x object
    Object.entries(goalDeleteButtons).map((object) => {
        
        object[1].addEventListener("click", function(event) {
            // Prevent propagation of click event to parent div tags
            event.stopPropagation();
            deleteGoal(event);
        });
    });
    
    // Instantiate 'addTask' function after clicking 'addTask' button
    taskSaver = document.getElementById("taskSave");
    taskSaver.addEventListener("click", addTask);
    
    /* Renders 'Save changes' button when changes are made in tasks pop-up window */
    goalUpdate = document.getElementById("goalUpdate");
    saveTaskChangeButton = document.getElementById('saveTaskChanges');
    
    goalUpdate.addEventListener('change', function() {
       // Render button to save changes
       saveTaskChangeButton.style.display = "block";
    });
    
    // Inititate submission of user-implemented task changes (task additions, edits, and checks) to database
    var goalWindow = document.getElementById('goalUpdate');
    var checkedTaskList = document.getElementById('checkedTaskList')

    goalWindow.addEventListener('submit', function(submit) {
        submit.preventDefault();

        // Reset hidden HTML divs that store name and 'checked status' of checked and unchecked boxes
        checkedTaskList.innerHTML = '';
        // Sort checkboxes into either checked or unchecked list, store task_id's as value
        for (var element of document.getElementsByClassName('form-check-input')) {
            
            // Assemble list of checked elements
            if (element.checked) {
                
                // Create input for each checked element and add to hidden form
                var checkedTaskInsert = document.createElement('input');
                checkedTaskInsert.setAttribute('name', 'checkeditem');
                checkedTaskInsert.setAttribute('value', element.id);
                
                checkedTaskList.appendChild(checkedTaskInsert);
            }
            
            // Assemble list of unchecked elements
            else {
                // Create input for each unchecked element, add to hidden form
                var uncheckedTaskInsert = document.createElement('input');
                uncheckedTaskInsert.setAttribute('name', 'uncheckeditem');
                uncheckedTaskInsert.setAttribute('value', element.id);
                
                checkedTaskList.appendChild(uncheckedTaskInsert);
            }
        }
        // Submit checkedTaskList form
        goalWindow.submit();
    });

}

function setAttributes(el, attrs) {
    /* Helper function to set multiple attributes for element at once */
    for(var key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }

function replaceTextWithForms() {
    /* Front-end: This function replaces text elements in goalRender window with 
    inputs, then replaces those inputs with the original text element formats 
    containing the values that were entered in the inputs after clicking 'Save Changes' */

    /* Back-end: After 'Save Changes' but before conversion into text elements, a snapshot 
    of all data in the goalRender window is sent to the server to update database values 
    where necessary*/

    // Hide edit button - only want to trigger this function when forms are not yet loaded
    document.getElementById('h2Wrap').style.display = 'none';
    document.getElementById('editIndicator').style.display = 'block';

    // Editable elements: goal name, goal category (select), goal deadline (date), and task names
    var textData = document.getElementsByClassName('data-editable');
    var titleData = document.getElementsByClassName('data-editable-big')
    var selectData = document.getElementsByClassName('data-editable-select');
    var dateData = document.getElementsByClassName('data-editable-date');

    // Create elements of corresponding input type to replace text elements
    // Replace task elements with forms
    for (var i=0; i<textData.length; i++) {
        var currentText = textData[i];
        var textInput = document.createElement('input');
        setAttributes(textInput, {'value': currentText.innerHTML, 
                                  'autocomplete': 'off', 
                                  'class': 'form-control popUpForm data-editable', 
                                  'name': 'taskname', 
                                  'type': 'text',
                                  'required': 'true'});
        
        // Create form to store id of task being replaced, so database can perform lookup                          
        var corrTaskID = document.createElement('input');
        setAttributes(corrTaskID, {'value': textData[i].parentNode.childNodes[0].id,
                                   'type': 'hidden',
                                   'name': 'updatedTaskIDs'});
        currentText.parentNode.appendChild(corrTaskID);
        currentText.parentNode.replaceChild(textInput, currentText);
        
        
        // Render delete button
        taskDeleteButtons = document.getElementsByClassName('taskDeleteButton');
        for (button of taskDeleteButtons) {
            button.style.display = 'block';
        }
    };
    
    // Replace goal name (title) with form 
    var goalName = titleData[0];
    var titleInput = document.createElement('input');
    setAttributes(titleInput, {'value': goalName.innerHTML, 
                                'autocomplete': 'off', 
                                'class': 'form-control data-editable', 
                                'name': 'goalDisplayName', 
                                'type': 'text',
                                'required': 'true'});
    goalName.parentNode.replaceChild(titleInput, goalName);
    

    // Replace category name with select input
    var catName = selectData[0];
    var catInput = document.createElement('select');
    setAttributes(catInput, {'class': 'form-control tableForm data-editable-select',
                             'name': catName.id,
                             'id': 'updateCategoryInput',
                             'required': 'true'});
    
    // Allow 'create new' functionality for select
    catInput.onchange = function() {
        if (catInput.value === 'Create New') {
            // Render all new category form-related UI features
            var newCatFormInfo = document.getElementsByClassName('updateNewCatForm');
            for (item of newCatFormInfo) {
                item.style.display = 'block';
            }
        }
    }
    
    catOptions = document.getElementsByClassName('loadedCat');
    
    // Clone catOptions into catOptionsCopy in order to use list append
    // iteratively without removing items from original list
    catOptionsCopy = [];
    for (option of catOptions) {
        catOptionsCopy.push(option.cloneNode(true));
    }

    // Use a countdown for for loop since length of list being iterated over decreases
    // with each iteration
    for (var j=0;j<catOptions.length;j++) {
        catInput.appendChild(catOptionsCopy[j]);
    }
    // Original text value was just text inside a table cell, so use appendChild instead
    // of replaceChild to maintain table structure
    catInput.value = catName.innerHTML;
    catName.innerHTML = '';
    catName.appendChild(catInput);

    // Replace deadline date with date input
    var dateName = dateData[0];
    var dateInput = document.createElement('input');
    setAttributes(dateInput, {'type': 'date',
                              'class': 'form-control data-editable-date',
                              'name': dateName.id,
                              'value': dateName.innerHTML,
                              'required': 'true'});
    
    dateName.innerHTML = '';
    dateName.appendChild(dateInput);

    // Replace all forms with the original div tags with their values updated
    // var save = function() {
    //     // Create original div elements for task names to replace forms with new user-entered values
    //     for (k=0;k<textData.length;k++) {
    //         // Form to replace
    //         var currentForm = textData[k];

    //         // Div containing form value to replace form
    //         var taskText = document.createElement('div');
    //         setAttributes(taskText, {'class': 'col-9 left userdisplay-sm data-editable'})
    //         taskText.innerHTML(currentForm.value);
    //     }
    // }
}


function goalFormValidate() {
    /* Send GET Request to server with name of submitted goal - if in database, set goal input form to 'invalid' */
    /* This function is invoked after each keystroke in goalForm */
}

function deleteGoal(event) {
    /* Allows user to delete a goal by clicking on 'X' symbol in goal button*/
    activeButton = event.target;
    
    if (confirm('This goal will be deleted permanently and will NOT be marked as completed. Continue?')) {
        // Send GET request to find id of goal to delete in database
        $.get('/delete?goalID=' + activeButton.parentNode.id, function() {
        
            // Delete goal bucket in real time
            activeButton.parentNode.parentNode.parentNode.removeChild(activeButton.parentNode.parentNode);
        });  
    }
}

function deleteTask(deleteButton) {
    /* Allows user to delete tasks by clicking on 'X' symbol in task list */

    if (confirm('This task will be deleted permanently and will NOT be marked as completed. Continue?')) {
        // Send GET request to find id of task to delete in database
        $.get('/delete?taskID=' + deleteButton.id, function() {

            // Delete information about task from DOM after database removal
            deleteButton.parentNode.parentNode.removeChild(deleteButton.parentNode);
            // Delete hidden taskrow where renderGoal window refers to when rendering task
            var taskRows = document.getElementsByClassName('taskrow');
            for (row of taskRows) {
                if (row[6].innerHTML === deleteButton.id) {
                    row.parentNode.removeChild(row);
                }
            }
        }) 
    }
}


function renderGoal(elementID) {
    /* Pull goal and task information specific to the user-clicked goal name.
    All info comes from hidden div tags, each of which contains a goal or task attribute loaded from musedb schema*/
    
    // Find the correct information to display in rendered goal pop-up
    document.getElementById('openedGoalID').value = elementID;
    document.getElementById('updatedGoalID').value = elementID;
    
    var goalRows = document.getElementsByClassName("goalrow");
    var goalAttributesRow = [];
    
    for (var i=0;i<goalRows.length;i++) {
        // Each element should be a list of div tags, each containing an attribute
        var goalAttributesDivs = goalRows[i].getElementsByClassName("goalattribute");
        
        // Check if last div in goalRows contains a matching ID
        if (goalAttributesDivs[4].innerHTML === elementID) {
            
            // If true, push all information from that row into goalAttributesRow
            for (var j=0; j<goalAttributesDivs.length; j++) {
                goalAttributesRow.push(goalAttributesDivs[j].innerHTML);
            }
        }
    }
    
    // Create inserts for goalDisplayName banner
    goalDisplayName = '<div class="data-editable-big">' + goalAttributesRow[1] + '</div>'
    goalEditButton = '<h2 id=h2Wrap><span class="goalEditButton userdisplay-md" id="goalEditButton" onclick="replaceTextWithForms();">Edit</span></h2>';
    
    // Display information in pop up goal display window
    $('#goalDisplayName').html(goalDisplayName + goalEditButton); // Render name of goal and edit button
    $('#goalDisplayCat').html(goalAttributesRow[2]); // Render category of goal
    $('#goalDisplayDate').html(goalAttributesRow[3]); // Render deadline for goal
    
    /* Second part of this function renders list of tasks associated with the selected goal */
    
    var taskRows = document.getElementsByClassName("taskrow")
    var taskAttributesRows = [];
    
    /* Generate a list of lists, with each sublist containing all of the task attributes loaded from
       their hidden HTML form */
    for (var k=0;k<taskRows.length;k++) {
        var taskAttributesDivs = taskRows[k].getElementsByClassName("taskattribute");
        
        // Check if last div in taskRow contains id matching goal id
        if (taskAttributesDivs[1].innerHTML === elementID) {
            var taskRow = [];
            for (n=0; n<taskAttributesDivs.length; n++) {
                taskRow.push(taskAttributesDivs[n].innerHTML);
            }
            taskAttributesRows.push(taskRow);
        }
    }
    /* Example taskAttributesRows output format:
       [[46, 13, 'Host on Domain', 0, 2019-11-27, NULL, 6], [46, 13, 'Learn Pandas', 1, 2019-11-27, 2019-12-22, 7]] */
    
    // Task-specific information
    document.getElementById('taskList').innerHTML = '';
    for (m=0;m<taskAttributesRows.length;m++) {
        // Assemble DOM Node for each task/checkbox combo
        
        // Task delete + task name + checkbox container
        var row = document.createElement('div');
        row.setAttribute('class', 'form-group row task');

        // Task delete button (hidden)
        taskDeleteButton = document.createElement('span');
        taskDeleteButton.innerHTML = '&#9447;';
        setAttributes(taskDeleteButton, {'class': 'taskDeleteButton hidden',
                                         'id': taskAttributesRows[m][6],
                                         'onclick': 'deleteTask(this);'});
        
        // Task name
        var taskDiv = document.createElement('div');
        taskDiv.setAttribute('class', 'col-9 left userdisplay-sm data-editable');
        taskDiv.textContent = taskAttributesRows[m][2];
        
        // Checkbox container + checkbox
        var checkBoxCol = document.createElement('div');
        checkBoxCol.setAttribute('class', 'col-3');
        var checkBoxContainer = document.createElement('div');
        checkBoxContainer.setAttribute('class', 'form-check left');
        var checkBox = document.createElement('input');
        checkBox.setAttribute('class', 'form-check-input');
        checkBox.setAttribute('type', 'checkbox');
        checkBox.setAttribute('name', 'taskChecks');
        
        if (taskAttributesRows[m][3] === '1') {
            checkBox.setAttribute('checked', '1');
        }
        
        checkBox.setAttribute('id', taskAttributesRows[m][6]);
        
        checkBoxContainer.appendChild(checkBox);
        checkBoxCol.appendChild(checkBoxContainer);
        row.appendChild(taskDeleteButton);
        row.appendChild(taskDiv);
        row.appendChild(checkBoxCol);
        
        // Append new row to tasklist
        document.getElementById('taskList').appendChild(row);
        
        row.addEventListener('click', function(event) {
            // Check the checkbox whose parent element (function arg) was clicked
            checkBox = event.target.parentNode.childNodes[2].childNodes[0].childNodes[0];
            // Only run logic if the element clicked is in non-editable format
            if (row.childNodes[1].nodeName == "DIV") {
                if (checkBox.checked === true || checkBox.checked === 1) {
                    checkBox.checked = false;
                }
                else {
                    checkBox.checked = true;
                }
                document.getElementById('saveTaskChanges').style.display = 'block';
            }
        }, false);
    }
    
    // Render displaygoal pop-up window
    $('#displayGoal').css('display', 'block');
    
}

function addTask() {
    // Create variables to store goalID and taskname
    goalID = document.getElementById('openedGoalID').value;
    taskName = document.getElementById('newTaskName');
    
    $.get('/createtask?goalID=' + goalID + '&taskName=' + taskName.value, function(task_id) {
        /* GET Request to store newly created task in database and link to the correct goal using goalID
           Server returns the task id of the newly created task so any changes to the task (check/uncheck) can be
           properly saved in the database later */
        if (task_id) {
            // Assemble DOM Node for each task/checkbox combo
        
            // Task delete + task name + checkbox container
            var row = document.createElement('div');
            row.setAttribute('class', 'form-group row task');

            // Task delete button (hidden)
            taskDeleteButton = document.createElement('span');
            taskDeleteButton.innerHTML = '&#9447;';
            setAttributes(taskDeleteButton, {'class': 'taskDeleteButton hidden',
                                            'id': task_id,
                                            'onclick': 'deleteTask(this);'});

            // Task name
            var taskDiv = document.createElement('div');
            taskDiv.setAttribute('class', 'col-9 left userdisplay-sm data-editable');
            taskDiv.textContent = taskName.value;
            
            // Checkbox container + checkbox
            var checkBoxCol = document.createElement('div');
            checkBoxCol.setAttribute('class', 'col-3');
            var checkBoxContainer = document.createElement('div');
            checkBoxContainer.setAttribute('class', 'form-check left');
            var checkBox = document.createElement('input');
            checkBox.setAttribute('class', 'form-check-input');
            checkBox.setAttribute('type', 'checkbox');
            checkBox.setAttribute('id', task_id);
            
            checkBoxContainer.appendChild(checkBox);
            checkBoxCol.appendChild(checkBoxContainer);
            row.appendChild(taskDeleteButton);
            row.appendChild(taskDiv);
            row.appendChild(checkBoxCol);
            
            // Append new row to tasklist
            document.getElementById('taskList').appendChild(row);
            
            // Clear new task form
            taskName.value = "";
            
            row.addEventListener('click', function(event) {
                // Check the checkbox whose parent element (function arg) was clicked
                checkBox = event.target.parentNode.childNodes[2].childNodes[0].childNodes[0];
                // Only run logic if the element clicked is in non-editable format
                if (row.childNodes[1].nodeName == "DIV") {
                    if (checkBox.checked === true || checkBox.checked === 1) {
                        checkBox.checked = false;
                    }
                    else {
                        checkBox.checked = true;
                    }
                    document.getElementById('saveTaskChanges').style.display = 'block';
                }
            }, false);
            
            // Render save changes button
            $('#saveTaskChanges').css('display', 'block');
        }
    });
}

function newCatComplete() {
    // Pass variables to CatComplete() for newly created goal
    
    // New category form
    var newCat = document.getElementById('newcatform');
    // Category drop-down list
    var catSelect = document.getElementById('categoryInput');

    CatComplete(newCat, catSelect);

    // Hide 'Create New' form
    $('#newcat').html('');
}

function existingCatComplete() {
    // Pass variables to CatComplete() for existing goal

    // New category form
    var newCat = document.getElementById('updateNewCatFormText');
    // Category drop-down list
    var catSelect = document.getElementById('updateCategoryInput');

    CatComplete(newCat, catSelect);

    // Hide 'Create New' form info
    var newCatFormInfo = document.getElementsByClassName('updateNewCatForm');
    for (item of newCatFormInfo) {
        item.style.display = 'none';
    }
}

function CatComplete(newCat, catSelect) {
    /* Used to validate and save new user-created categories in two scenarios:
    1. creating goals 
    2. editing them later on
    pass different variables depending on which scenario applies */
    // var newCat = document.getElementById('newcatform');
    // var catSelect = document.getElementById('categoryInput');
    
    //Create list of existing categories by pulling from HTML 
    var existingCatElements = document.getElementsByClassName('databaseCategories');

    var existingCatList = [];
    for (i=0;i<existingCatElements.length;i++) {
        existingCatList.push(existingCatElements[i].innerHTML);
    }
    
    //Check submitted category against list of categories, apply invalid if true
    if (existingCatList.includes(newCat.value)) {
        alert('Category already exists');
    }
    
    else {
        // Append user input to list of categories in drop-down, then select user input by default 
        $(catSelect).append('<option>' + newCat.value + '</option>');
        $(catSelect).val(newCat.value);
        
        // Mark form as valid
        newCat.setCustomValidity('');
        catSelect.setCustomValidity('');
    }
}

function XMLRenderCat() {
    /* Function to create AJAX request input (see XMLRender function below) to load text input form for new category
    when user selects 'Create New' in the Create Goal pop-up window */
    var createCat = document.getElementById("categoryInput");
    
    // Only render new form if user selected "Create New"
    if (createCat.value === "Create New") {
        // Send AJAX Request for contents of file titled "newcat.html" to insert in between div tags with id "newcat"
        XMLRender("newcat");
    }
    else {
        $('#newcat').html('');
    }
}

function XMLRender(requestName) {
    /* Function to send AJAX request to load a given HTML file based on the string passed to it by an upstream function
    (e.g. see XMLRenderCat) */
    var ajaxReq = new XMLHttpRequest();

    ajaxReq.onreadystatechange = function() {
        // If object has made a request and returned success:
        if (ajaxReq.readyState == 4 && ajaxReq.status == 200) {
            // Insert rendered HTML forms inside of div tags specified by unique ID [requestName]
            $('#' + requestName).html(ajaxReq.responseText);
        }
    };

    // Pass contents of [requestName].html file into div tags specified
    ajaxReq.open("GET", '/static/' + requestName + '.html', true);
    ajaxReq.send();
}