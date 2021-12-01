import Pop from './PopEngine/PopEngine.js'
import FrameCounter_t from './PopEngine/FrameCounter.js'

import Camera_t from './PopEngine/Camera.js'
import AssetManager from './PopEngine/AssetManager.js'
import {CreateCubeGeometry} from './PopEngine/CommonGeometry.js'
import {CreateTranslationMatrix} from './PopEngine/Math.js'

let AppCamera = new Camera_t();
//	try and emulate default pose a bit
AppCamera.Position = [0,0,0];
AppCamera.LookAt = [0,0,-1];




async function CreateUnitCubeTriangleBuffer(RenderContext)
{
	const Geometry = CreateCubeGeometry(0,1);
	const TriangleIndexes = undefined;
	const TriBuffer = await RenderContext.CreateGeometry(Geometry,TriangleIndexes);
	return TriBuffer;
}


let CubeShader = null;
function RegisterAssets()
{
	if ( CubeShader )
		return;
	AssetManager.RegisterAssetAsyncFetchFunction('Cube01', CreateUnitCubeTriangleBuffer );


	const Attribs = ['LocalPosition','LocalUv'];
	const VertFilename = 'Geo.vert.glsl';
	const FragFilename = 'Colour.frag.glsl';
	CubeShader = AssetManager.RegisterShaderAssetFilename(FragFilename,VertFilename,null,Attribs);
}



function GetSceneRenderCommands(RenderContext,Camera)
{
	const Viewport = [0,0,1,1];
	RegisterAssets();
	
	const CubePosition = [0,0,-5];
	const Geo = AssetManager.GetAsset('Cube01',RenderContext);
	const Shader = AssetManager.GetAsset(CubeShader,RenderContext);
	const Uniforms = {};
	Uniforms.Colour = [1,0,1];
	Uniforms.LocalToWorldTransform = CreateTranslationMatrix(...CubePosition);
	Uniforms.WorldToCameraTransform = Camera.GetWorldToCameraMatrix();
	Uniforms.CameraProjectionTransform = Camera.GetProjectionMatrix(Viewport);
	
	const DrawCube = ['Draw',Geo,Shader,Uniforms];
	
	return [DrawCube];
}

async function GetMainRenderCommands(RenderContext)
{
	const SetRenderTarget = ['SetRenderTarget',null,[1,1,0]];

	let Camera = AppCamera;

	const Commands = [ SetRenderTarget ];
	try
	{
		Commands.push( ...GetSceneRenderCommands(RenderContext,Camera) );
	}
	catch(e)
	{
		console.error(e);
	}
	
	return Commands;
}



async function XrLoop(RenderContext,XrOnWaitForCallback)
{
	const FrameCounter = new FrameCounter_t(`XR frame`);
	function OnXrRender()
	{
		FrameCounter.Add();
	}
	

	while ( true )
	{
		try
		{
			const Device = await Pop.Xr.CreateDevice( RenderContext, GetSceneRenderCommands, XrOnWaitForCallback );
			//	this needs updating
			Device.OnRender = OnXrRender;
		}
		catch(e)
		{
			console.error(`Failed to create xr ${e}`);
			await Pop.Yield(1*1000);
		}
	}
}

async function RenderLoop(Canvas,XrOnWaitForCallback)
{
	const RenderView = new Pop.Gui.RenderView(null,Canvas);
	const RenderContext = new Pop.Sokol.Context(RenderView);
	
	if ( XrOnWaitForCallback )
		XrLoop(RenderContext,XrOnWaitForCallback).catch(console.error);
	
	const FrameCounter = new FrameCounter_t(`Render`);
	
	while ( RenderView )
	{
		const Commands = await GetMainRenderCommands(RenderContext);
		await RenderContext.Render(Commands);
		FrameCounter.Add();
	}
}


export default async function Bootup(XrOnWaitForCallback)
{
	await RenderLoop('Window',XrOnWaitForCallback);
}
