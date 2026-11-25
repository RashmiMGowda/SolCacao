import { test } from 'vitest'
import assert from 'node:assert/strict'
import { schemas } from './validation.js'
import { en } from '../localization/dictionaries/en.js'
import { es } from '../localization/dictionaries/es.js'
test('B2B quantities require whole kilograms within the supported range', () => {
 for (const quantityKg of ['', 0, 4, 5.5, 1000001]) assert.ok(schemas[0].validate({ cacaoProfile:'Madagascar 55%', quantityKg }).error)
 for (const quantityKg of [5, 25, 1000000]) assert.equal(schemas[0].validate({ cacaoProfile:'Madagascar 55%', quantityKg }).error, undefined)
 assert.ok(schemas[0].validate({ cacaoProfile:'invalid', quantityKg:25 }).error)
})
test('B2B branding is required and text limits are enforced', () => {
 for (const brandName of ['', ' ', 'A', 'A'.repeat(161)]) assert.ok(schemas[1].validate({ brandName, designDetails:'' }).error)
 assert.equal(schemas[1].validate({ brandName:'AB', designDetails:'A'.repeat(500) }).error, undefined)
 assert.ok(schemas[1].validate({ brandName:'AB', designDetails:'A'.repeat(501) }).error)
})
test('B2B packaging and white-label values remain canonical API values', () => {
 for (const packagingOption of ['Luxury Gift Box','Foil Wrap','Event Sleeve']) {
  for (const whiteLabel of ['company-branding','solcacao-cobranding']) assert.equal(schemas[2].validate({ packagingOption, whiteLabel, specialInstructions:'' }).error,undefined)
 }
 for (const values of [{}, {packagingOption:'invalid',whiteLabel:'company-branding'}, {packagingOption:'Event Sleeve',whiteLabel:''}, {packagingOption:'Event Sleeve',whiteLabel:'company-branding',specialInstructions:'A'.repeat(501)}]) assert.ok(schemas[2].validate(values).error)
})
test('shared B2B dictionaries have matching nonempty EN/ES keys', () => {
 const visit = (a,b) => {assert.deepEqual(Object.keys(a),Object.keys(b)); for(const key of Object.keys(a)){if(typeof a[key]==='object')visit(a[key],b[key]);else {assert.equal(typeof b[key],'string');assert.ok(b[key].length)}}}
 visit(en.b2b,es.b2b)
 assert.notEqual(en.b2b.wizard.quantityError,es.b2b.wizard.quantityError)
})
