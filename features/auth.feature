Feature: Google OAuth sign-in

  Background:
    Given the app is loaded at "/"

  Scenario: Unauthenticated user is redirected to login
    Given the user is not signed in
    When the app loads
    Then the user sees the login page
    And there is a "Sign in with Google" button

  Scenario: User signs in with Google
    Given the user is on the login page
    When the user clicks "Sign in with Google"
    And Google OAuth succeeds with email "user@example.com"
    Then the user is redirected to "/topics"
    And the access token is stored in memory only
    And the access token is NOT stored in localStorage

  Scenario: Access token is never persisted to localStorage
    Given the user has signed in
    Then localStorage does not contain a key matching "token"
    And localStorage does not contain a key matching "access"

  Scenario: Expired token triggers silent re-auth
    Given the user is signed in
    When the access token expires
    Then a silent re-auth is attempted
    And if silent re-auth fails the user is redirected to "/login"

  Scenario: User signs out
    Given the user is signed in and on "/topics"
    When the user clicks "Sign out"
    Then the access token is cleared from memory
    And the user is redirected to "/login"
