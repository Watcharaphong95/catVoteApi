export interface UserPostResponse {
    username: string;
    email:    string;
    password: string;
    avatar: string;
}

export interface UserPostResponseForUID {
    uid:      number;
    username: string;
    email:    string;
    password: string;
    avatar: string;
}