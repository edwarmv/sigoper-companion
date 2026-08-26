# Phone Connection Context

This context defines the language used when a Windows desktop shares a local connection with a phone.

## Network connection

**Connection address**:
The private IPv4 address and shared server port that a phone uses to reach the desktop.
_Avoid_: desktop address, local UI port

**Interface candidate**:
A Windows network interface/address that may be used as the connection address.
_Avoid_: adapter (when referring to the phone-facing address)

**Recommended address**:
The single connection address selected automatically for primary presentation when multiple interface candidates are available.
_Avoid_: active IP, default IP

**Shared server**:
The desktop-side service that accepts the phone connection on the dynamically allocated shared server port.
_Avoid_: app server, UI server

## Connection diagnosis

**Firewall diagnostic**:
An explanation of whether Windows Firewall may be preventing inbound phone traffic, without changing firewall rules by itself.
_Avoid_: firewall fix, firewall error

**Connection payload**:
The QR code or copyable URL containing the current connection address and any required phone connection data.
_Avoid_: link (when precision matters), invite
