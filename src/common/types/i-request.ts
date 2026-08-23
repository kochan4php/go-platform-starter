import type { Request } from 'express';
import type DecodedUser from './decoded-user.js';

/**
 * @description Interface for expand Request express object
 * @author {Deo Sbrn}
 */
export default interface IRequest extends Request {
    user?: DecodedUser;
}
