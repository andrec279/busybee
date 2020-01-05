let registerfields = document.getElementById('register');

// Check validity of username/password/confirmation as user types it in
registerfields.onkeyup = function() {
    // Render check route, input username form entry, check validity of username entry
    $.get('/check?username=' + username.value, function(available) {
        if (available === false) {

            // Render username form invalid for JS styling later on
            username.setCustomValidity('username already exists');

            // Custom error messages based on reason for error
            if (username.value === '') {
                $('#usernamefeedback').html('Please enter a username');
            }
            else {
                $('#usernamefeedback').html('Username is already taken');
            }
        }
        else {
            username.setCustomValidity('');
        }
    });

    // Check password and confirmation and assign validity
    if (password.value !== confirmation.value) {

        // Render password and confirmation forms invalid
        password.setCustomValidity('passwords must match');
        confirmation.setCustomValidity('passwords must match');

        // Prompt user to ensure password and confirmation match
        $('div.passcheck').html('Passwords must match')
    }
    else if (password.value === "" && confirmation.value === "") {

        // Render password and confirmation forms invalid
        password.setCustomValidity('empty field');
        confirmation.setCustomValidity('empty field');

        // Prompt user to enter and confirm password
        $('#passfeedback').html('Please enter a password');
        $('#confeedback').html('Please confirm your password');
    }
    else {
        password.setCustomValidity('');
        confirmation.setCustomValidity('');
    }
};

/* Set validity of username field - reject null entries or entries that already exist */
registerfields.addEventListener('submit', function(formsubmit) {
    let username = document.getElementById("username");
    let password = document.getElementById("password");

    // If previous check fails, program proceeds and stops submit before validity check
    formsubmit.preventDefault();

    // Submit form if both pwsubmit and usersubmit are true
    if (username.checkValidity() && password.checkValidity()) {
        registerfields.submit();
    }
}, false);