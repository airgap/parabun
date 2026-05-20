import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import { createContext } from 'svelte';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

const [get, set] = createContext();

export { get };

export default function Main($$anchor, $$props) {
	$.push($$props, true);
	set('hello');
	Child($$anchor, {});
	$.pop();
}