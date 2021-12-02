import Pop from './PopEngine/PopEngine.js'
import FrameCounter_t from './PopEngine/FrameCounter.js'

import Camera_t from './PopEngine/Camera.js'
import AssetManager from './PopEngine/AssetManager.js'
import {CreateCubeGeometry} from './PopEngine/CommonGeometry.js'
import {CreateTranslationMatrix} from './PopEngine/Math.js'
import {CreateRandomImage} from './PopEngine/Images.js'


let AppCamera = new Camera_t();
//	try and emulate default pose a bit
AppCamera.Position = [0,0,0];
AppCamera.LookAt = [0,0,-1];
let LastXrRenderTimeMs = null;
let DefaultDepthTexture = CreateRandomImage(16,16);
let CubePosition = [0,1,-1];
let CubeSize = 0.20;


async function CreateUnitCubeTriangleBuffer(RenderContext)
{
	const Geometry = CreateCubeGeometry(0,CubeSize);
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



function GetSceneRenderCommands(RenderContext,Camera,Viewport=[0,0,1,1])
{
	//	make screen camera track xr camera
	AppCamera.Position = Camera.Position.slice();
	AppCamera.LookAt = Camera.LookAt.slice();
	
	RegisterAssets();
	
	const ClearCommand = ['SetRenderTarget',null,[0,0,1]];
			
	//	normalise viewport
	Viewport[0] = 0;
	Viewport[1] = 0;
	Viewport[3] /= Viewport[2];
	Viewport[2] /= Viewport[2];

	const Geo = AssetManager.GetAsset('Cube01',RenderContext);
	const Shader = AssetManager.GetAsset(CubeShader,RenderContext);
	const Uniforms = {};
	Uniforms.Colour = [1,0,1];
	Uniforms.LocalToWorldTransform = CreateTranslationMatrix(...CubePosition);
	Uniforms.WorldToCameraTransform = Camera.GetWorldToCameraMatrix();
	Uniforms.CameraProjectionTransform = Camera.GetProjectionMatrix(Viewport);
	Uniforms.DepthTexture = Camera.DepthImage || DefaultDepthTexture;
	
	const DrawCube = ['Draw',Geo,Shader,Uniforms];
	
	return [ClearCommand,DrawCube];
}

function GetXrRenderCommands()
{
	LastXrRenderTimeMs = Pop.GetTimeNowMs();
	return GetSceneRenderCommands(...arguments);
}

async function GetMainRenderCommands(RenderView,RenderContext)
{
	let Camera = AppCamera;

	try
	{
		const Viewport = RenderView.GetScreenRect();
		const Commands = GetSceneRenderCommands(RenderContext,Camera,Viewport);
		return Commands;
	}
	catch(e)
	{
		console.error(e);
		const ClearRed = ['SetRenderTarget',null,[1,0,0]];
		return [ClearRed];
	}
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
			LastXrRenderTimeMs = null;
			const Device = await Pop.Xr.CreateDevice( RenderContext, GetXrRenderCommands, XrOnWaitForCallback );
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
		const Commands = await GetMainRenderCommands(RenderView,RenderContext);
		await RenderContext.Render(Commands);
		FrameCounter.Add();

		//	only intermediately render if xr is running
		//	todo: check time since render and "turn on" again if we havent XR rendered for a while
		if ( LastXrRenderTimeMs )
			await Pop.Yield(10*1000);
	}
}


export default async function Bootup(XrOnWaitForCallback)
{
	await RenderLoop('Window',XrOnWaitForCallback);
}
