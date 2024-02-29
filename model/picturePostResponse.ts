export interface PicturePostResponse {
    p_uid:   number;
    picture: string;
    score: number;
}

export interface PictureGetResponse {
    pid:     number;
    p_uid:   number;
    picture: string;
    score:   number;
}