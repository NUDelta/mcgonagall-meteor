# McGonagall Meteor app & Wizard Control Center
Meteor app component of the [McGonagall](https://github.com/NUDelta/mcgonagall) project. See that README for instructions as how to setup the entire architecture.

This project includes the client code responsible for the Wizard Control Center, image analysis for native and multi-fidelity elements detection, and server code to talk to the [McGonagall iOS component](https://github.com/NUDelta/mcgonagall-ios).

## Requirements
Must connect to `rppt.meteor.com` using Firefox.

## Usage
The Wizard Control Center presents information to wizards in three distinct columns during prototyping testing sessions.

The left column includes the stream key to connect to the McGonagall iOS app, button to detect and react to native and multi-fidelity elements in the stream, and full camera stream feed (to make sure TopCodes are within bounds).

The middle column displays a stream of the user's iOS app interface.

The right column allows you to send a task for the user to render on the iOS app, shows any messages sent by the user on the native keyboard (after pressing enter), and displays the users location.

## Contact
Feel free to reach out with issues or questions!

Meg Grasse at [meggrasse@u.northwestern.edu](mailto:meggrasse@u.northwestern.edu)  
Andrew Finke
