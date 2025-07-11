/* eslint-disable no-unused-vars */
export enum roles {
	admin = 1,
	officer = 2,
	reader = 3,
  }
  
  export enum entityStatus {
	deleted = 0,
	active = 1,
	pending = -1,
  }
  
  export enum signStatus {
	unsigned = 0,
	readForSign = 1,
	rejected = 2,
	delegated = 3,
	inProcess = 4,
	Signed = 5,
	readyForDispatch = 6,
	dispatched = 7,
  }
  
  export const signStatusDisplay: Record<signStatus, string> = {
	[signStatus.unsigned]: "Unsigned",
	[signStatus.readForSign]: "Ready for Signature",
	[signStatus.rejected]: "Rejected",
	[signStatus.delegated]: "Delegated",
	[signStatus.inProcess]: "In Process",
	[signStatus.Signed]: "Signed",
	[signStatus.readyForDispatch]: "Ready for Dispatch",
	[signStatus.dispatched]: "Dispatched",
  };