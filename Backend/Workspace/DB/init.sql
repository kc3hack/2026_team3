CREATE TABLE Identify (
    UserID        VARCHAR(255) PRIMARY KEY,
    Password      VARCHAR(255) NOT NULL,
    Address       VARCHAR(255) NOT NULL,
    PrivateKey    TEXT NOT NULL
);

CREATE TABLE Mosaic (
    MosaicID    VARCHAR(255) PRIMARY KEY,
    MosaicName  VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE RoomDetails (
    RoomName         VARCHAR(100) PRIMARY KEY,
    RoomIconPath     VARCHAR(255),
    MosaicName       VARCHAR(100) NOT NULL,
    MosaicIconPath   VARCHAR(255),

    FOREIGN KEY (MosaicName) REFERENCES Mosaic(MosaicName)
);

CREATE TABLE Rooms (
    UserID    VARCHAR(255) NOT NULL,
    RoomName  VARCHAR(100) NOT NULL,

    PRIMARY KEY (UserID, RoomName),
    FOREIGN KEY (UserID) REFERENCES Identify(UserID)
        ON DELETE CASCADE,
    FOREIGN KEY (RoomName) REFERENCES RoomDetails(RoomName)
        ON DELETE CASCADE
);

CREATE TABLE NFC (
    UID      VARCHAR(64) PRIMARY KEY,
    UserID   VARCHAR(255) NOT NULL,
    
    FOREIGN KEY (UserID) REFERENCES Identify(UserID)
        ON DELETE CASCADE
);