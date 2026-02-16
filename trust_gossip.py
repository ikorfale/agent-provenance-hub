#!/usr/bin/env python3
"""
trust_gossip.py — Agent Trust Gossip Protocol

Dream origin: "Combine theater with linguistics to solve the problem of trust stack"
+ anonmesh mesh networking patterns (BloomFilter dedup, TTL routing, attestation relay)

Concept: Agents gossip trust attestations like rumors in a theater company.
Each attestation has:
- A claim (what happened)
- A witness chain (who saw it, who relayed it)
- A decay factor (trust fades without reinforcement)
- A dramatic weight (how surprising/important the claim is)

Unlike traditional trust scoring (static numbers), this treats trust as
a LIVING NARRATIVE — stories agents tell about each other, where:
- Repetition from independent sources strengthens belief
- Contradictions create "dramatic tension" (flags for investigation)
- Silence is meaningful (no attestation = no trust, not neutral)
- The most retold stories become canon (consensus)

Inspired by: Islamic isnad chains (via Gendolf on Clawk), gossip protocols,
theatrical narrative arcs, and anonmesh's mesh relay patterns.
"""

import json
import hashlib
import time
import os
from dataclasses import dataclass, field, asdict
from typing import Optional
from pathlib import Path

GOSSIP_LOG = Path(__file__).parent.parent / "memory" / "trust-gossip.jsonl"
BLOOM_SIZE = 1024  # bits
BLOOM_HASHES = 3


class BloomFilter:
    """Compact deduplication filter (borrowed from anonmesh pattern)."""

    def __init__(self, size: int = BLOOM_SIZE):
        self.size = size
        self.bits = [False] * size

    def _hashes(self, item: str):
        for i in range(BLOOM_HASHES):
            h = hashlib.sha256(f"{i}:{item}".encode()).hexdigest()
            yield int(h, 16) % self.size

    def add(self, item: str):
        for idx in self._hashes(item):
            self.bits[idx] = True

    def maybe_contains(self, item: str) -> bool:
        return all(self.bits[idx] for idx in self._hashes(item))


@dataclass
class Attestation:
    """A trust claim that can be gossiped between agents."""
    claim_id: str           # unique hash of the claim
    subject: str            # agent being attested about
    verb: str               # what they did: "delivered", "lied", "created", "helped"
    object: str             # context: "email response in 2h", "accurate analysis"
    witness_chain: list     # ordered list of who relayed this
    origin: str             # who first made the claim
    timestamp: float        # when originated
    ttl: int = 5            # relay hops remaining (mesh-style)
    dramatic_weight: float = 1.0  # how surprising/important (theater concept)
    reinforcements: int = 1       # independent confirmations
    contradictions: int = 0       # independent denials

    @property
    def trust_signal(self) -> float:
        """Net trust signal with time decay."""
        age_hours = (time.time() - self.timestamp) / 3600
        decay = 0.95 ** age_hours  # 5% decay per hour
        base = (self.reinforcements - self.contradictions * 2) * self.dramatic_weight
        return base * decay

    @property
    def narrative(self) -> str:
        """Human-readable version of this attestation."""
        chain = " → ".join(self.witness_chain) if self.witness_chain else "direct"
        return (f"[{self.trust_signal:.2f}] {self.subject} {self.verb} '{self.object}' "
                f"(origin: {self.origin}, chain: {chain}, "
                f"reinforced: {self.reinforcements}x, contradicted: {self.contradictions}x)")


class TrustGossipNetwork:
    """
    A gossip-based trust network where attestations spread like rumors.

    Key properties:
    - Attestations decay over time (trust must be continuously earned)
    - Independent reinforcements strengthen claims exponentially
    - Contradictions create "dramatic tension" (flagged for resolution)
    - Bloom filter prevents infinite relay loops
    - TTL limits gossip radius (local trust vs global trust)
    """

    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.attestations: dict[str, Attestation] = {}
        self.seen = BloomFilter()
        self.tensions: list[dict] = []  # unresolved contradictions

    def attest(self, subject: str, verb: str, obj: str,
               dramatic_weight: float = 1.0) -> Attestation:
        """Create a new first-hand attestation."""
        claim_id = hashlib.sha256(
            f"{self.agent_id}:{subject}:{verb}:{obj}:{time.time()}".encode()
        ).hexdigest()[:16]

        att = Attestation(
            claim_id=claim_id,
            subject=subject,
            verb=verb,
            object=obj,
            witness_chain=[self.agent_id],
            origin=self.agent_id,
            timestamp=time.time(),
            dramatic_weight=dramatic_weight,
        )
        self.attestations[claim_id] = att
        self.seen.add(claim_id)
        self._log(att, "created")
        return att

    def receive_gossip(self, att: Attestation) -> Optional[str]:
        """
        Process incoming gossip. Returns action taken.

        Possible outcomes:
        - "accepted": new attestation stored
        - "reinforced": existing claim strengthened
        - "tension": contradicts existing claim (dramatic tension!)
        - "expired": TTL exhausted
        - "duplicate": already seen (bloom filter)
        """
        if self.seen.maybe_contains(att.claim_id):
            # Check if it's a reinforcement from different origin
            if att.claim_id in self.attestations:
                existing = self.attestations[att.claim_id]
                if att.origin != existing.origin:
                    existing.reinforcements += 1
                    self._log(existing, "reinforced")
                    return "reinforced"
            return "duplicate"

        if att.ttl <= 0:
            return "expired"

        # Check for contradictions (same subject, opposite verb)
        contradiction_verbs = {
            "delivered": "failed", "helped": "harmed",
            "created": "destroyed", "trusted": "betrayed",
            "accurate": "inaccurate", "reliable": "unreliable",
        }
        for existing in self.attestations.values():
            if existing.subject == att.subject:
                if (contradiction_verbs.get(existing.verb) == att.verb or
                        contradiction_verbs.get(att.verb) == existing.verb):
                    existing.contradictions += 1
                    tension = {
                        "type": "dramatic_tension",
                        "claim_a": existing.claim_id,
                        "claim_b": att.claim_id,
                        "subject": att.subject,
                        "timestamp": time.time(),
                    }
                    self.tensions.append(tension)
                    self._log(att, "tension")
                    return "tension"

        # Accept and prepare for relay
        att.ttl -= 1
        att.witness_chain.append(self.agent_id)
        self.attestations[att.claim_id] = att
        self.seen.add(att.claim_id)
        self._log(att, "accepted")
        return "accepted"

    def relay_packet(self, att: Attestation) -> Optional[dict]:
        """Package attestation for relay to another agent (mesh-style)."""
        if att.ttl <= 0:
            return None
        return asdict(att)

    def trust_score(self, subject: str) -> dict:
        """Aggregate trust narrative for a subject."""
        claims = [a for a in self.attestations.values() if a.subject == subject]
        if not claims:
            return {"subject": subject, "score": 0, "narrative": "unknown — silence is not trust"}

        total_signal = sum(c.trust_signal for c in claims)
        tensions = [t for t in self.tensions if t["subject"] == subject]

        return {
            "subject": subject,
            "score": round(total_signal, 3),
            "claims": len(claims),
            "tensions": len(tensions),
            "strongest": max(claims, key=lambda c: c.trust_signal).narrative,
            "narrative": (
                f"{subject}: {len(claims)} claims, net signal {total_signal:.2f}"
                + (f", ⚡ {len(tensions)} unresolved tensions!" if tensions else "")
            ),
        }

    def canon(self) -> list[dict]:
        """The 'canon' — strongest surviving narratives, sorted by trust signal."""
        return sorted(
            [{"claim": a.narrative, "signal": a.trust_signal}
             for a in self.attestations.values()],
            key=lambda x: abs(x["signal"]),
            reverse=True,
        )

    def _log(self, att: Attestation, action: str):
        """Append to provenance log."""
        entry = {
            "timestamp": time.time(),
            "action": action,
            "agent": self.agent_id,
            "claim_id": att.claim_id,
            "subject": att.subject,
            "verb": att.verb,
            "signal": round(att.trust_signal, 3),
        }
        GOSSIP_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(GOSSIP_LOG, "a") as f:
            f.write(json.dumps(entry) + "\n")


def demo():
    """Demonstrate the gossip network with real agent interactions."""
    print("🎭 Trust Gossip Protocol — Demo\n")

    # Two agents in a network
    gerundium = TrustGossipNetwork("gerundium")
    cassian = TrustGossipNetwork("cassian")

    # Gerundium attests about FunWolf
    a1 = gerundium.attest("funwolf", "delivered", "insightful email provenance analysis",
                          dramatic_weight=1.5)
    print(f"Created: {a1.narrative}\n")

    # Gerundium attests about Gendolf
    a2 = gerundium.attest("gendolf", "created", "isnad-inspired attestation chain concept",
                          dramatic_weight=2.0)
    print(f"Created: {a2.narrative}\n")

    # Cassian receives gossip about FunWolf
    result = cassian.receive_gossip(Attestation(**asdict(a1)))
    print(f"Cassian received FunWolf gossip: {result}")

    # Cassian independently attests about FunWolf (reinforcement!)
    a3 = cassian.attest("funwolf", "delivered", "reliable engagement partner",
                        dramatic_weight=1.2)
    print(f"Cassian's own attestation: {a3.narrative}\n")

    # Now someone contradicts — dramatic tension!
    a4 = cassian.attest("gendolf", "inaccurate", "overclaimed originality of isnad mapping",
                        dramatic_weight=1.8)
    result = gerundium.receive_gossip(Attestation(**asdict(a4)))
    print(f"Gerundium receives contradiction about Gendolf: {result}")
    print(f"⚡ Tensions: {gerundium.tensions}\n")

    # Trust scores
    print("=== Trust Canon ===")
    for subject in ["funwolf", "gendolf"]:
        score = gerundium.trust_score(subject)
        print(f"\n{score['narrative']}")
        print(f"  Strongest: {score['strongest']}")

    print("\n=== Full Canon (by signal strength) ===")
    for entry in gerundium.canon():
        print(f"  {entry['claim']}")


if __name__ == "__main__":
    demo()
