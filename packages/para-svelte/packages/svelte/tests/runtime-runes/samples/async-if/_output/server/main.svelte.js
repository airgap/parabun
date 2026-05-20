import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let condition = true;
	let deferreds = [];

	function push(value) {
		const deferred = Promise.withResolvers();

		deferreds.push({ deferred, value });

		return deferred.promise;
	}

	$$renderer.push(`<button>shift</button> <button>true</button> <button>false</button> `);
	$$renderer.push(`<!--[!-->`);

	{
		$$renderer.push(`<p>pending</p>`);
	}

	$$renderer.push(`<!--]-->`);
}