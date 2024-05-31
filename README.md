# strapi-webauthn

`strapi-webauthn` is a Strapi plugin that enables authentication and login via WebAuthn/Passkey.

## Installation

To install this plugin, run the following command in your Strapi project:

```bash
npm install strapi-webauthn
```

Then, add the plugin to your Strapi configuration:
// config/plugins.js

```
module.exports = {
  'strapi-webauthn': {
    enabled: true
   },
};
```

Routes

The plugin exposes the following routes:

| Command                                 | Method | Description                        | Return                               |
|-----------------------------------------|--------|------------------------------------|--------------------------------------|
| /register/generate-options?user={email} | GET    | Generate Options for Passkey       | {challenge...challengeId}            |
| /register/verify/{challengeId}          | POST   | Verify signed challenge            | {success: true/false}                |
| /auth/generate-options?user={email}     | GET    | Generate Challenge                 | {challenge...challengeId}            |
| /auth/verify/{challengeId}              | POST   | Verify signed challenge            | {success: false}<br>or<br>{user,jwt} |
| /pre-check?user={email}                 | GET    | Check if Email has passkey or not  | {success: false}                     |
| /listKeys?user=email                    | GET    | Lists keys for user, AUTH required | [{..keys}]                           |

# Usage

Frontend Examples

Register a New User

```
async function register() {
    const optionsResponse = await fetch('.../register/generate-options?user=' + email, {
    method: 'GET'
    });
    const options = await optionsResponse.json();
    const challengeId = options.processId;

    let attResp;
    try {
        attResp = await startRegistration(options);
    } catch (error) {
        throw error;
    }

    let verification = await fetch('.../webauthn/register/verify/' + challengeId, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(attResp),
    });
    return verification.json();
}
```

Authenticate a User

```
async function login(user) {
const optionsResponse = await fetch('http://localhost:1337/webauthn/auth/generate-options?user=' + user, {
method: 'GET'
});

    const options = await optionsResponse.json();
    let asseResp;
    const processId = options.processId;

    try {
        asseResp = await startAuthentication(options);
    } catch (error) {
        throw error;
    }

    const verificationResp = await fetch('.../webauthn/auth/verify/' + processId, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(asseResp),
    });

    return await verificationResp.json();
}
```

# Contributing

If you want to contribute to this project, please follow these steps:

	1.	Fork the repository.
	2.	Create a new branch (git checkout -b feature-branch).
	3.	Make your changes.
	4.	Commit your changes (git commit -m 'Add some feature').
	5.	Push to the branch (git push origin feature-branch).
	6.	Create a new Pull Request.

License

This project is licensed under the MIT License - see the LICENSE file for details.
