export default {
  default:  ({ env }) => ({
    origin:[],
    rpID: env.rpID || 'rpID',
    rpName: env.rpID || 'rpName'
  }),
  validator() {},
};
