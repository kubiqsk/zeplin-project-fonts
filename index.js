#!/usr/bin/env node

import { ZeplinApi, Configuration } from "@zeplin/sdk";
import inquirer from "inquirer";

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require("fs");

var allTextStyles = {};

function getFontsList( layers, screenName ){
	for( let j = 0; j < layers.length; j++ ){
		const layer = layers[j];
		if( typeof layer.textStyles != 'undefined' ){
			for( let k = 0; k < layer.textStyles.length; k++ ){
				const style = layer.textStyles[k].style;
				// fontSize, fontStyle, fontStretch, lineHeight, letterSpacing, textAlign, color
				if( typeof allTextStyles[ style.fontFamily ] == 'undefined' ){
					allTextStyles[ style.fontFamily ] = {};
				}
				if( typeof allTextStyles[ style.fontFamily ][ style.fontWeight ] == 'undefined' ){
					allTextStyles[ style.fontFamily ][ style.fontWeight ] = {};
				}
				if( typeof allTextStyles[ style.fontFamily ][ style.fontWeight ][ style.postscriptName ] == 'undefined' ){
					allTextStyles[ style.fontFamily ][ style.fontWeight ][ style.postscriptName ] = {};
				}
				if( typeof allTextStyles[ style.fontFamily ][ style.fontWeight ][ style.postscriptName ][ screenName ] == 'undefined' ){
					allTextStyles[ style.fontFamily ][ style.fontWeight ][ style.postscriptName ][ screenName ] = 0;
				}
				allTextStyles[ style.fontFamily ][ style.fontWeight ][ style.postscriptName ][ screenName ]++;
			}
		}
		if( typeof layer.layers != 'undefined' ){
			getFontsList( layer.layers, screenName );
		}
	}
}

const run = async () => {
	// read file or ask for accessToken and save it
	const configFilePath = `${process.cwd()}/token.dat`;
	let token = '';
	if( fs.existsSync( configFilePath ) ){
		token = fs.readFileSync( configFilePath, 'utf8' );
	}
	if( ! token ){
		const config = await inquirer.prompt([
			{
				type: "input",
				name: "token",
				message: "Enter your Zeplin token from https://app.zeplin.io/profile/developer :",
			}
		]);
		token = config.token;
		fs.writeFileSync( configFilePath, token );
	}

	const zeplin = new ZeplinApi(
		new Configuration({ 
			accessToken: token
		})
	);

	// loading projects
	console.log('Getting your projects...');
	const { data: projects } = await zeplin.projects.getProjects();

	// let user select some project
	const userProject = await inquirer.prompt([
		{
			type: "list",
			name: "projectName",
			message: "Select one project",
			choices: projects.filter( item => item.status == 'active' ).map( item => item.name ),
		}
	]);

	// remember selected project
	const selectedProject = projects.find( item => item.name == userProject.projectName );

	// get project screens
	console.log(`Getting all screens...`);
	const { data: screens } = await zeplin.screens.getProjectScreens( selectedProject.id );

	// get text styles from all screens and layers
	
	for( let i = 0; i < screens.length; i++ ){
		const screen = screens[i];
		console.log(`Getting fonts from screen ${screen.name}:`);
		console.log(`https://app.zeplin.io/project/${selectedProject.id}/screen/${screen.id}`);
		const { data: screenData } = await zeplin.screens.getLatestScreenVersion( selectedProject.id, screen.id );
		getFontsList( screenData.layers, screen.name );
	}
	console.log('----');
	console.log(`Here is the font list from project ${selectedProject.name}:`);
	console.log(`https://app.zeplin.io/project/${selectedProject.id}/dashboard`);
	console.dir( allTextStyles, { depth: null } );
};

run();