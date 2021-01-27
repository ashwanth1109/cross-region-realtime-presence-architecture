#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { Deploy2Stack } from '../lib/deploy2-stack';

const app = new cdk.App();
new Deploy2Stack(app, 'openh-region2-stack-ash');
