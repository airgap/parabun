import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';
import { createContext } from 'svelte';

const [get, set] = createContext();

export { get };

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		set('hello');
		Child($$renderer, {});
	});
}