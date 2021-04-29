function profilemain() {
    var openpw = document.getElementById('openpw'); // Button to open pw form
    var pwform = document.getElementById('pw'); // Entirety of pw form

    // Call function to open changeInfo with 'newpass' parameter when user clicks 'add cash' button
    openpw.addEventListener('click', XMLRenderPW);

    // Check pw form validity upon submission of newpass and confirm fields
    pwform.addEventListener('submit', function(formsubmit) {
        var newpass = document.getElementById('newpass');
        var confirm = document.getElementById('confirm');

        formsubmit.preventDefault();

        // Submit pw form after validity check
        if (newpass.checkValidity() && confirm.checkValidity()) {
            pwform.submit();
        }
    }, false);
}


// Allow user to preview and submit an updated profile picture
function selectPicture() {
    var proPic = document.querySelector('img'); // Image placeholder - select image tag
    var reader = new FileReader();
    var file = document.querySelector('input[type=file]').files[0]; // User-selected file
    
    // Copy URL of user-selected file to 'src' attribute of profile picture
    reader.onloadend = function() {
        proPic.src = reader.result;
    };

    // Read user-selected file data into a URL format
    if (file) {
        reader.readAsDataURL(file);
    }

    // Call XMLRender to render "Save" button upon selecting a file
    XMLRender('imgsubmit');

    var form = document.getElementById('picture');

    // Event listener to trigger anonymous function, sending proPic src to hidden text field 'picURL'
    form.addEventListener('submit', function() {
        document.getElementById('picURL').value = proPic.src;
    });
}


// Function to run passCheck from eventlistener (function in userpassval.js)
function passCheckClick() {
    passCheck(formsubmit);
}

// Functions to pass keyword parameter into changeInfo to initiate unique XML request
function XMLRenderPW() {
    XMLRender('passchange')
}

// Asynchronous generation of forms to change user information
function XMLRender(requestName) {
    var ajaxReq = new XMLHttpRequest();

    ajaxReq.onreadystatechange = function() {
        // If object has made a request and returned success:
        if (ajaxReq.readyState == 4 && ajaxReq.status == 200) {

            // Insert rendered HTML forms inside of div tags specified by unique ID [requestName]
            $('#' + requestName).html(ajaxReq.responseText);
        }
    }

    // Pass contents of [requestName].html file into div tags specified
    ajaxReq.open("GET", '/static/' + requestName + '.html', true);
    ajaxReq.send();
}