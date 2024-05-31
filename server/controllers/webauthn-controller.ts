import {Strapi} from '@strapi/strapi';
import {PublicKeyCredentialRequestOptionsJSON} from "@simplewebauthn/types";
import * as moment from 'moment';
import base64url from 'base64url';
import * as _ from 'lodash';
import {VerifyRegistrationResponseOpts} from "@simplewebauthn/server";


const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const crypto = require('crypto');

const rpID = strapi.plugin('webauthn').config('rpID');
//'localhost';
const rpName =  strapi.plugin('webauthn').config('rpName');
//'easyli.io'
function decodeBase64(data) {
  return Uint8Array.from(atob(data).split(""), (x) => x.charCodeAt(0));
}

function encodeBase64(data) {
  return btoa(String.fromCharCode(...new Uint8Array(data)));
}
export default ({strapi}: { strapi: Strapi }) => ({
  async listKeys(ctx) {
    if (!ctx.state.user) {
      ctx.send({
        success: false,
        error: 'Nice try, not logged in'
      })
      return
    }
    const entities = await strapi.query('plugin::webauthn.passkey').findMany({where: {user: ctx.state.user.id}})
    return entities;
  },
  async preCheck(ctx) {
    const pUser = ctx.request.query.user;
    if (!pUser) {
      ctx.send({
        success: false,
        error: 'User not found'
      })
      return
    }
    const user = await strapi.query('plugin::users-permissions.user').findOne({where: {email: pUser}})
    if (!user) {
      ctx.send({
        success: false,
        error: 'User not found'
      })
      return

    }
    const passkey = await strapi.query('plugin::webauthn.passkey').findOne({where: {user: user.id}})
    if (!passkey) {
      return ctx.send({success: false});
    } else {
      return ctx.send({success: true});
    }

  },
  async registerGenerateOptions(ctx) {
    const {user} = ctx.query;
    const existingUser = await strapi.query('plugin::users-permissions.user').findOne({where: {email: user}});

    if (!existingUser) {
      return ctx.send({error: 'User not found'});
    }


    const userID = Buffer.from(existingUser.id.toString());
    let userPasskeys = await strapi.query('plugin::webauthn.passkey').findMany({
      where: {user: existingUser.id}
    })
    const options = await generateRegistrationOptions({
      rpName: rpName,
      rpID: rpID,
      userID,
      userName: Buffer.from(existingUser.email),
      userDisplayName: existingUser.email,
      attestationType: 'none',
      excludeCredentials: userPasskeys.map(passkey => ({
        id: passkey.authenticatorID,
        // Optional
        transports: passkey.transports.split(','),
      })),
      authenticatorSelection: {
        // Defaults
        residentKey: 'preferred',
        userVerification: 'preferred',
        // Optional
        authenticatorAttachment: 'platform',
      },
    });


    // Store challenge for verification
    const dbChallenge = await strapi.query('plugin::webauthn.challenge').create({
      data: {
        user: existingUser,
        challenge: options.challenge,
        validUTC: moment.utc().add({minute: 5}).format(), // 5 minutes validity
      }
    });

    options.processId = dbChallenge.id;
    ctx.send(options);
    this.cleanUp(existingUser.id);
    /* Delete all invalid Challenges */
  },
  async registerVerify(ctx) {

    const challengeId = ctx.params.challengeId;
    const challenge = await strapi.query('plugin::webauthn.challenge').findOne({
      where: {id: challengeId},
      populate: ['user.id']
    })
    console.log('found challenge!', challenge);
    if (moment.utc(challenge.validUTC).isBefore(moment.utc())) {
      ctx.send({
        success: false,
        error: 'Challenge timeout'
      })
      return
    }


    console.log('Now user');
    const tUser = await strapi.query('plugin::users-permissions.user').findOne({where: {id: challenge.user.id}})
    if (!tUser) {
      ctx.send({
        success: false,
        error: 'User not found'
      })
      return
    }

    try {

      const verification = await verifyRegistrationResponse({
        response: ctx.request.body,
        expectedChallenge: challenge.challenge,
        expectedOrigin:  strapi.plugin('webauthn').config('origin'),
        expectedRPID: rpID,
      });


      if (verification.verified) {
        console.log(verification);

        const {
          counter,
          aaguid,
          attestationObject,
          attestationInfo,
          credentialPublicKey,
          credentialID,
          credentialType,
          credentialBackedUp,
          credentialDeviceType,
          userVerified
        } = verification.registrationInfo;
        const pKey: any = {
          user: tUser,
          userID: tUser.email,
          authenticatorID:ctx.request.body.id,
          credPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
          credID: credentialID,
          counter,
          aaguid,
          userVerified,
          credBackedUp: credentialBackedUp,
          credType: credentialType,
          credDeviceType: credentialDeviceType,
          transports: ctx.request.body.response.transports.toString(),
          attestationObject: Buffer.from(attestationObject).toString('base64')
        };


        console.log(Buffer.from(attestationObject).toString('base64'));
        /*if (attestationInfo.attestationType) {
          pKey.attestationType = attestationInfo.attestationType;
        }*/

        if (attestationInfo && attestationInfo.authenticatorData && attestationInfo.authenticatorData.userVerification) {
          pKey.userVerification = attestationInfo.authenticatorData.userVerification;
        }
        if (attestationInfo && attestationInfo.authenticatorData && attestationInfo.authenticatorData.signCount) {
          pKey.signCount = attestationInfo.authenticatorData.signCount;
        }


        const passkey = await strapi.query('plugin::webauthn.passkey').create({data: pKey});

        ctx.send({success: true});
      } else {
        ctx.send({success: false, error: 'Registration verification failed'});
      }
    } catch (error) {
      console.log(error);
      ctx.send({success: false, error: 'Verification failed', msg: error});
    }

  },


  async authGenerateOptions(ctx) {

    const pUser = ctx.request.query.user;
    if (!pUser) {
      ctx.send({
        success: false,
        error: 'User not found'
      })
      return
    }
    const user = await strapi.query('plugin::users-permissions.user').findOne({where: {email: pUser}})
    if (!user) {
      ctx.send({
        success: false,
        error: 'User not found'
      })
      return
    }
    let userPasskeys = await strapi.query('plugin::webauthn.passkey').findMany({
      where: {user: user.id}
    })
    const options: any = await generateAuthenticationOptions({
      rpID,
      allowCredentials: userPasskeys.map(passkey => ({
        id: passkey.credID,
        // Optional
        transports: passkey.transports.split(','),
      }))
      // Require users to use a previously-registered authenticator
    })

    const dbChallenge = await strapi.query('plugin::webauthn.challenge').create({
      data: {
        user: user,
        challenge: options.challenge,
        validUTC: moment.utc().add({minute: 5}).format(), // 5 minutes validity
      }
    });
    options.processId = dbChallenge.id;
    return options;
  },


  async authVerify(ctx) {
    const challengeId = ctx.params.challengeId;
    const challenge = await strapi.query('plugin::webauthn.challenge').findOne({
      where: {id: challengeId},
      populate: ['user.id']
    })
    console.log('found challenge!', challenge);
    if (moment.utc(challenge.validUTC).isBefore(moment.utc())) {
      ctx.send({
        success: false,
        error: 'Challenge timeout'
      })
      return
    }


    console.log('Now user');
    const tUser = await strapi.query('plugin::users-permissions.user').findOne({where: {id: challenge.user.id}})
    if (!tUser) {
      ctx.send({
        success: false,
        error: 'User not found'
      })
      return
    }

    let passkey = await strapi.query('plugin::webauthn.passkey').findOne({
      where: {user: tUser.id, credID: ctx.request.body.id}
    })
    console.log(passkey);
    if (!passkey) {
      ctx.send({
        success: false,
        error: 'Wrong Authentication'
      })
      return
    }

    let verification;
    try {
      const opt = {
        response: ctx.request.body,
        expectedChallenge: challenge.challenge,
        expectedOrigin: ['http://localhost:8100', 'https://app.easyli.io'],
        expectedRPID: rpID,
        authenticator: {
          credentialID: passkey.credID,
          credentialPublicKey: decodeBase64(passkey.credPublicKey.toString()),
          counter: passkey.counter,
          transports: passkey.transports.split(','),
        }
      };

      console.log(opt);
      verification = await verifyAuthenticationResponse(opt);
    } catch (error) {
      console.error(error);
      return ctx.send({success:false,error: error.message});
    }



    if (verification.verified) {
      // Authentifizierung erfolgreich
      const token = strapi.plugin('users-permissions').service('jwt').issue({id: tUser.id});
      return ctx.send({
        jwt: token,
        user: _.pick(tUser,['id,email,username'])
      });
    } else {
      // Authentifizierung fehlgeschlagen
      ctx.send({success: false});
    }

    return 'authVerify';
  },
  async cleanUp(userId) {
    // Find old Challenges that are no longer valid and delete them;
    const challenges = await strapi.query('plugin::webauthn.challenge').findMany({
      where: {
        user: {id: userId},
        "validUTC": {
          "$lte": moment.utc().format()
        }
      }
    })
    _.map(challenges, (c) => {
      strapi.query('plugin::webauthn.challenge').delete({where: {id: c.id}});
    })
  }
});
