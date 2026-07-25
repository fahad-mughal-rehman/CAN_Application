
#include "stdafx.h"
#include <winsock2.h>
#include <windows.h>
#include <ws2tcpip.h>
#include <fstream>
#include <iostream>
#include <direct.h>
#include <sstream>
#include <string>
#include <thread>
#include <atomic>
#include <mutex>
#include <vector>
#pragma comment(lib, "ws2_32.lib")

#define SERVER_IP "127.0.0.1"
#define SERVER_PORT 5001

using namespace std;

atomic<bool> running(true);
mutex fileMutex;       // protects file writes
mutex socketSendMutex; // protects send() on socket

					   // Safe string conversion (avoid std::to_string clash earlier)
string intToString(int value) {
	ostringstream oss;
	oss << value;
	return oss.str();
}

// Thread-safe file overwrite (logs on failure)
void safeOverwriteFile(const string& filename, const string& value) {
	lock_guard<mutex> lg(fileMutex);
	ofstream file(filename, ios::trunc);
	if (!file.is_open()) {
		cerr << "[ERR] Failed to open " << filename << " for writing." << endl;
		return;
	}
	file << value << endl;
	file.close();
}

// Overwrite status.txt with exact command
void writeCommandToStatus(const string& command) {
	safeOverwriteFile("D:\\ConsoleApplication1\\ConsoleApplication1\\status.txt", command);
}

// Handle P, B, C, R commands
void processSpecialCommands(const string& cmd) {
	if (cmd.empty()) return;
	char prefix = cmd[0];
	string value = cmd.substr(1);

	switch (prefix) {
	case 'P':
		safeOverwriteFile("D:\\ConsoleApplication1\\ConsoleApplication1\\pulse.txt", value);
		break;
	case 'B':
		safeOverwriteFile("D:\\ConsoleApplication1\\ConsoleApplication1\\beams.txt", value);
		break;
	case 'C':
		safeOverwriteFile("D:\\ConsoleApplication1\\ConsoleApplication1\\config.txt", value);
		break;
	case 'R':
		safeOverwriteFile("D:\\ConsoleApplication1\\ConsoleApplication1\\repeat.txt", value);
		break;
	default:
		cerr << "[WARN] Unknown special command prefix: " << prefix << endl;
		break;
	}
}

void processABCommand(const string& cmd) {
	if (cmd.empty()) return;
	char c = cmd[0];
	if (c == 'P' || c == 'B' || c == 'C' || c == 'R')
		processSpecialCommands(cmd);
}

// Thread-safe send wrapper (adds newline and serializes sends)
bool sendMessageToServer(SOCKET sock, const string& message) {
	string formatted = message + "\n";
	lock_guard<mutex> lg(socketSendMutex);
	int result = send(sock, formatted.c_str(), (int)formatted.size(), 0);
	if (result == SOCKET_ERROR) {
		int err = WSAGetLastError();
		cerr << "[ERR] send() failed: " << err << endl;
		return false;
	}
	cout << "Sent to server: " << formatted;
	return true;
}

// Parse and handle a single logical command (one line, trimmed)
void handleCommandLine(SOCKET sock, const string& line) {
	if (line.empty()) return;
	string command = line;
	// trim both ends
	while (!command.empty() && isspace((unsigned char)command.back())) command.pop_back();
	size_t pos = 0;
	while (pos < command.size() && isspace((unsigned char)command[pos])) pos++;
	if (pos > 0) command = command.substr(pos);

	//cout << "Processing command: [" << command << "]" << endl;

	// --- NEW: HANDLE RESET OF CAN MODULE ---
	if (command == "0x95") {
		sendMessageToServer(sock, "Resetting CAN Module...");

		// kill running CAN module
		system("taskkill /IM ConsoleApplication1.exe /F");
		Sleep(1000);

		// restart
		if (_chdir("D:\\ConsoleApplication1\\ConsoleApplication1") != 0) {
			perror("Failed to Change Directory");
			return;
		}
		system("start D:\\ConsoleApplication1\\Release\\ConsoleApplication1.exe");
			
		//system("start \"\" \"D:\\ConsoleApplication1\\ConsoleApplication1\\ConsoleApplication1.exe\"");

		sendMessageToServer(sock, "CAN Module Reset Completed");
		return;
	}


	if (command == "exit") {
		writeCommandToStatus("EXIT");
		running = false;
		// acknowledge
		sendMessageToServer(sock, "Command executed: exit");
		return;
	}

	bool known = true;
	// HEX COMMANDS
	if (command == "0x1A") writeCommandToStatus("CAN ON");
	else if (command == "0x1B") writeCommandToStatus("CAN1 Channel Open");
	else if (command == "0x1F") writeCommandToStatus("CAN0 Channel Open");
	else if (command == "0x1C") writeCommandToStatus("Main Relay ON");
	else if (command == "0x1D") writeCommandToStatus("TRM1-3 ON");
	else if (command == "0x1E") writeCommandToStatus("TRM2-4 ON");
	else if (command == "0x0A") writeCommandToStatus("CAN Close");
	else if (command == "0x0B") writeCommandToStatus("CAN1 Channel Close");
	else if (command == "0x0F") writeCommandToStatus("CAN0 Channel Close");
	else if (command == "0x0C") writeCommandToStatus("Main Relay OFF");
	else if (command == "0x0D") writeCommandToStatus("TRM1-3 OFF");
	else if (command == "0x0E") writeCommandToStatus("TRM2-4 OFF");
	else if (command == "0x90") writeCommandToStatus("Send Configuration");
	else if (command == "0x91") writeCommandToStatus("Start Beam Forming");
	else if (command == "0x92") writeCommandToStatus("Stop Beam Forming");
	else if (command == "0x93") writeCommandToStatus("Reset");
	//else if (command == "0x08") writeCommandToStatus("Read");
	else if (!command.empty() && (command[0] == 'P' || command[0] == 'B' || command[0] == 'C' || command[0] == 'R')) {
		processABCommand(command);
	}
	else {
		known = false;
	}

	if (known) {
		sendMessageToServer(sock, "Command executed: " + command);
	}
	//else {
		// Optionally respond that it's unknown
		//sendMessageToServer(sock, "Unknown command: " + command);
	//}
}

// Listener thread: blocking recv, collects data until newline(s) and handles each line
void socketListener(SOCKET sock) {
	const int BUF_SIZE = 1024;
	vector<char> recvbuf(BUF_SIZE);
	string pending; // accumulates partial data

	while (running) {
		int bytesReceived = recv(sock, recvbuf.data(), BUF_SIZE, 0);
		if (bytesReceived > 0) {
			pending.append(recvbuf.data(), recvbuf.data() + bytesReceived);
			//modification
			this_thread::sleep_for(chrono::milliseconds(2));
			// extract lines separated by '\n' (support \r\n as well)
			size_t pos;
			while ((pos = pending.find('\n')) != string::npos) {
				string line = pending.substr(0, pos);
				// remove trailing '\r' if present
				if (!line.empty() && line.back() == '\r') line.pop_back();
				handleCommandLine(sock, line);
				pending.erase(0, pos + 1);
			}
		}
		else if (bytesReceived == 0) {
			cerr << "[INFO] Server closed connection." << endl;
			running = false;
			break;
		}
		else {
			int err = WSAGetLastError();
			// recv is blocking; errors are fatal except maybe WSAEINTR
			cerr << "[ERR] recv() failed with: " << err << endl;
			running = false;
			break;
		}
	}

	cout << "Socket listener stopped." << endl;
}

// Tail-like reader for can_log.txt
// Keeps file offset between iterations and sends only new lines
void canLogSender(SOCKET sock) {
	const string path = "D:\\ConsoleApplication1\\ConsoleApplication1\\can_log_status.txt";
	streamoff lastPos = 0;

	cout << "[INFO] CAN log sender started." << endl;

	while (running) {
		ifstream canFile(path, ios::in | ios::binary);
		if (!canFile.is_open()) {
			cerr << "[WARN] Failed to open CAN log: " << path << endl;
			this_thread::sleep_for(chrono::milliseconds(200));
			continue;
		}

		// Move to last read position
		canFile.seekg(0, ios::end);
		streamoff fileSize = canFile.tellg();
		if (fileSize < lastPos || lastPos < 0) {
			// file truncated or replaced — restart
			lastPos = 0;
		}

		canFile.seekg(lastPos, ios::beg);

		string line;
		while (getline(canFile, line)) {
			if (line.empty()) continue;
			string msg = "CAN_LOG:" + line;
			sendMessageToServer(sock, msg);
			//cout << "[TX] " << msg << endl;
		}

		// Record new read position
		lastPos = canFile.tellg();
		if (lastPos < 0) lastPos = fileSize; // handle EOF

		canFile.close();
		this_thread::sleep_for(chrono::milliseconds(200));
	}

	cout << "CAN log sender stopped." << endl;
}


int main() {
	// Initialize Winsock
	WSADATA wsaData;
	if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
		cerr << "[ERR] WSAStartup failed!" << endl;
		return 1;
	}

	// Create socket (blocking)
	SOCKET sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
	if (sock == INVALID_SOCKET) {
		cerr << "[ERR] Socket creation failed!" << endl;
		WSACleanup();
		return 1;
	}

	sockaddr_in serverAddr;
	ZeroMemory(&serverAddr, sizeof(serverAddr));
	serverAddr.sin_family = AF_INET;
	serverAddr.sin_port = htons(SERVER_PORT);
	if (inet_pton(AF_INET, SERVER_IP, &serverAddr.sin_addr) <= 0) {
		cerr << "[ERR] inet_pton failed for IP: " << SERVER_IP << endl;
		closesocket(sock);
		WSACleanup();
		return 1;
	}

	cout << "Connecting to server..." << endl;
	int retry = 0;
	while (connect(sock, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
		int err = WSAGetLastError();
		cerr << "[WARN] Connection failed (code " << err << "). Retrying..." << endl;
		if (++retry > 10) {
			cerr << "[ERR] Failed to connect after multiple attempts.\n";
			closesocket(sock);
			WSACleanup();
			return 1;
		}
		this_thread::sleep_for(chrono::milliseconds(200));
	}

	cout << "Connected to server (blocking socket)!" << endl;

	// Start listener thread (receives commands)
	thread listener(socketListener, sock);

	// Start CAN log sender thread (tail-like behavior)
	thread canSender(canLogSender, sock);

	// Main thread can perform other periodic tasks or simply wait while running.
	// We'll just wait until running becomes false.
	while (running) {
		this_thread::sleep_for(chrono::milliseconds(200));
	}

	// Shutdown
	cout << "Shutting down..." << endl;
	// Make sure to close socket to break recv() if necessary
	shutdown(sock, SD_BOTH);
	closesocket(sock);

	if (listener.joinable()) listener.join();
	if (canSender.joinable()) canSender.join();

	WSACleanup();
	cout << "Exited cleanly." << endl;
	return 0;
}