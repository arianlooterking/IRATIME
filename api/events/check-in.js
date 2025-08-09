import { handleEvent } from './_utils.js';
export default function handler(req, res){
  return handleEvent(req, res, 'check_in');
}
