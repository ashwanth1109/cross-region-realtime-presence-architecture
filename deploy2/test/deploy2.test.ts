import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Deploy2 from '../lib/deploy2-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Deploy2.Deploy2Stack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
