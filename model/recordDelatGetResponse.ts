export interface VoteLastGetResponse {
    response:  boolean;
    delayData: VoteLastGetResponseDelayData;
}

export interface VoteLastGetResponseDelayData {
    r_pid: number;
}