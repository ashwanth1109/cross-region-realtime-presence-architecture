#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { DeployStack } from "../lib/stacks/deploy-stack";
import { withEnv } from "../lib/util";

const app = new cdk.App();
new DeployStack(app, withEnv("root-stack"));
