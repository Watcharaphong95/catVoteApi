export interface VoteLastGetResponse {
    response:  boolean;
    delayData: VoteLastGetResponseDelayData;
}

export interface VoteLastGetResponseDelayData {
    r_pid: number;
}

export interface VotePostResponse {
    pid1:      number;
    pid2:      number;
    selectPic: number;
}

export interface DelayPostResponse {
    delay: number;
}